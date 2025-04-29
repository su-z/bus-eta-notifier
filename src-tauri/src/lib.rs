#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![fetch_eta])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod config;
use regex::Captures;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use std::sync::Mutex;

#[derive(Serialize, Deserialize)]
struct CacheItem {
    eta: i32,
    timestamp: u64,
}

impl CacheItem {
    fn new(eta: i32) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        CacheItem { eta, timestamp }
    }
}

struct EtaCache {
    cache: HashMap<String, CacheItem>,
    cache_ttl: u64,
}

impl EtaCache {
    fn new() -> Self {
        EtaCache {
            cache: HashMap::new(),
            cache_ttl: config::CACHE_TTL_MS,
        }
    }

    fn get(&self, key: &str) -> Option<&CacheItem> {
        self.cache.get(key)
    }

    fn set(&mut self, key: String, eta: i32) {
        self.cache.insert(key, CacheItem::new(eta));
    }

    fn is_valid(&self, item: &CacheItem) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        now - item.timestamp < self.cache_ttl
    }
}

lazy_static::lazy_static! {
    static ref ETA_CACHE: Mutex<EtaCache> = Mutex::new(EtaCache::new());
    static ref ROBOTS_CHECK_DONE: Mutex<Option<Result<(), String>>> = Mutex::new(None);
}

/// Fetches and checks the robots.txt file to ensure scraping is allowed
async fn check_robots_txt() -> Result<(), String> {
    let robots_url = config::ROBOTS_TXT_URL;
    println!("Checking robots.txt at: {}", robots_url);
    
    let response = reqwest::get(robots_url).await
        .map_err(|e| format!("Failed to fetch robots.txt: {}", e))?;
    
    if !response.status().is_success() {
        println!("No robots.txt found (status: {}), assuming crawling is allowed", response.status());
        return Ok(());
    }
    
    let content = response.text().await
        .map_err(|e| format!("Failed to read robots.txt content: {}", e))?;
    
    // Check if the content disallows our user-agent
    // This is a simple check - a real parser would be more comprehensive
    if content != "User-agent: *\nDisallow:" {
        return Err("Please check robots.txt manually".to_string());
    }
    
    println!("Robots.txt check passed");
    Ok(())
}

async fn fetch_eta_inner(stop: &str, route: &str) -> Result<i32, String> {
    // Check robots.txt once per session - drop the MutexGuard before the await
    {
        loop {
            match ROBOTS_CHECK_DONE.lock().unwrap().as_ref() {
                Some(Ok(_)) => {
                    println!("Robots.txt check already done.");
                    break;
                }
                Some(Err(e)) => {
                    return Err(e.clone());
                }
                None => {
                    println!("Robots.txt check not done, proceeding to check.");
                }
            }
            let check_result = check_robots_txt().await;
            ROBOTS_CHECK_DONE.lock().unwrap().replace(check_result.clone());
            if let Err(e) = check_result {
                return Err(e.clone());
            }
        }
    }

    // Use the eta_url macro for URL formatting
    let url = eta_url!(config::BASE_URL, route, stop);

    // Use the regex pattern macros
    let route_label_regex = route_label_regex!();

    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let html = response.text().await.map_err(|e| e.to_string())?;

    let mut found: Option<Captures> = None;

    for m in route_label_regex.captures_iter(&html) {
        println!("Found route label: {}", &m[1]);
        if &m[1] == route {
            found = Some(m);
            break;
        }
    }

    let m = match found {
        Some(m) => m,
        None => {
            // Use the error message macro
            return Err(err_route_not_found!(route));
        }
    };

    let m_index = m.get(0).unwrap().end();
    let truncated_html = &html[m_index..];

    // Use the DUE regex macro
    if let Some(_) = due_label_regex!().captures(truncated_html) {
        return Ok(1);
    }

    // Use the MIN regex macro
    if let Some(ms) = min_label_regex!().captures(truncated_html) {
        // Use the error message macro
        let min_match = ms[1].parse::<i32>().map_err(|_| err_cannot_parse_eta!())?;
        return Ok(min_match);
    }

    // Use the error message macro
    return Err(err_no_eta_found!());
}

#[tauri::command]
async fn fetch_eta(stop: String, route: String) -> Result<i32, String> {
    println!("Fetching ETA for stop: {}, route: {}", stop, route);

    let key = format!("{}-{}", stop, route);

    // Get cache result without holding the lock across await points
    let cache_result = {
        let cache = ETA_CACHE.lock()
            .map_err(|e| format!("Failed to acquire cache lock: {}", e))?;
            
        if let Some(item) = cache.get(&key) {
            println!("Cache item found for key: {}", key);
            if cache.is_valid(item) {
                println!("Cache hit for key: {}", key);
                Some(item.eta)
            } else {
                println!("Cache expired for key: {}", key);
                None
            }
        } else {
            println!("Cache miss for key: {}", key);
            None
        }
    }; // MutexGuard is dropped here

    // If we got a valid cached result, return it
    if let Some(eta) = cache_result {
        return Ok(eta);
    }

    // Otherwise fetch new data
    match fetch_eta_inner(&stop, &route).await {
        Ok(eta) => {
            // Update cache - acquire a new lock after the await
            let mut cache = ETA_CACHE.lock()
                .map_err(|e| format!("Failed to acquire cache lock for update: {}", e))?;
            cache.set(key.clone(), eta);
            // MutexGuard is dropped when cache goes out of scope
            Ok(eta)
        },
        Err(e) => {
            eprintln!("Error fetching ETA: {}", e);
            Err(e)
        }
    }
}
