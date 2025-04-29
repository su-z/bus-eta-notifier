//! Configuration for the bus-eta-notifier application
//! Contains URL patterns, regex patterns, and error macros
// Base URL for the Bus Tracker
pub const BASE_URL: &str = "www.ctabustracker.com/bustime/wireless/html";

pub const ROBOTS_TXT_URL: &str = "https://www.ctabustracker.com/bustime/wireless/robots.txt";

// URL format macro - expands to a formatted string
#[macro_export]
macro_rules! eta_url {
    ($base_url:expr, $route:expr, $stop:expr) => {
        format!(
            "https://{}/eta.jsp?route={}&direction=---&displaydirection=---&stop={}&findstop=on&selectedRtpiFeeds=&id={}",
            $base_url, $route, $stop, $stop
        )
    };
}

// Cache TTL in milliseconds
pub const CACHE_TTL_MS: u64 = 1000;

// Regex pattern macros - compile the regex at compile time
#[macro_export]
macro_rules! route_label_regex {
    () => {
        regex_macro::regex!("<strong class=\"larger\">#([0-9]+)&nbsp;</strong>")
    };
}

#[macro_export]
macro_rules! due_label_regex {
    () => {
        regex_macro::regex!("<strong class=\"larger\">DUE</strong>")
    };
}

#[macro_export]
macro_rules! min_label_regex {
    () => {
        regex_macro::regex!("<strong class=\"larger\">([0-9]+)&nbsp;MIN</strong>")
    };
}

// Error message macros - these expand to string literals
#[macro_export]
macro_rules! err_route_not_found {
    ($route:expr) => {
        format!("Route {} not found in response.", $route)
    };
}

#[macro_export]
macro_rules! err_cannot_parse_eta {
    () => {
        "Cannot parse ETA.".to_string()
    };
}

#[macro_export]
macro_rules! err_no_eta_found {
    () => {
        "No ETA found.".to_string()
    };
}
