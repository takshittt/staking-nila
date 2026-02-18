// Debug Detection Logic
// TEMPORARY: Force Enable for debugging
const isDebug = true; // new URLSearchParams(window.location.search).get("debug") === "true";

window.__MW_DEBUG__ = isDebug;

export const log = {
    debug: (...args) => console.debug("[MW]", ...args),
    info: (...args) => console.info("[MW]", ...args),
    warn: (...args) => console.warn("[MW]", ...args),
    error: (...args) => console.error("[MW]", ...args),
};

// Production Safety Guard
if (import.meta.env.PROD) {
    // // Completely silence standard console methods to prevent accidental leaks
    // console.log = () => { };
    // console.info = () => { };
    // console.warn = () => { };
    // console.error = () => { };
    // console.debug = () => { };
} else if (isDebug) {
    console.info("[MW] Debug mode enabled");
}
