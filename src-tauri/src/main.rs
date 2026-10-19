#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let log_path = "C:\\Users\\anes\\Desktop\\velune desk ver\\crash.log";
    std::fs::write(log_path, "App main() entered\n").ok();

    std::panic::set_hook(Box::new(move |info| {
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic payload".to_string()
        };
        let loc = info.location().map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column())).unwrap_or_default();
        let crash_msg = format!("PANIC: {}\nLocation: {}\nBacktrace: {:?}", payload, loc, std::backtrace::Backtrace::capture());
        let _ = std::fs::write("C:\\Users\\anes\\Desktop\\velune desk ver\\crash.log", crash_msg);
    }));

    desktop_app_lib::run();
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open("C:\\Users\\anes\\Desktop\\velune desk ver\\crash.log") {
        let _ = writeln!(f, "App main() exited cleanly");
    }
}
