fn main() {
    // No proto compilation required — Rust daemon uses native JSON-RPC 2.0 / REST.
    // tonic/prost are NOT used in this binary; removed from build to allow clean musl compilation.
    println!("cargo:rerun-if-changed=src/main.rs");
    println!("cargo:rerun-if-changed=src/shm_ring.rs");
}
