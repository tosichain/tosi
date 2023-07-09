use std::process::{Command, exit};
use std::env;
use std::fs;
use std::io::prelude::*;
use tempfile::NamedTempFile;
use serde_json::json;

fn main() -> std::io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if args.len() != 2 {
        println!("Usage: {} CID", args[0]);
        exit(1);
    }

    let cid = &args[1];

    let ipfs_api = env::var("ipfs_api").unwrap_or_else(|_| String::from("/ip4/127.0.0.1/tcp/5001"));
    let timeout = env::var("timeout").unwrap_or_else(|_| String::from("1m"));

    let mut tmpfile = NamedTempFile::new_in("/tmp")?;
    
    let output = Command::new("ipfs")
        .args(&["--timeout", &timeout, "--api", &ipfs_api, "dag", "export", cid])
        .output()
        .expect("Failed to execute command");

    if !output.status.success() {
        println!("{}", json!({"error":"failed"}));
        exit(0);
    }

    tmpfile.write_all(&output.stdout)?;

    let log2 = 31;
    let metadata = fs::metadata(tmpfile.path())?;
    let size = metadata.len();

    let cartesi_merkle_root_output = Command::new("/app/merkle-tree-hash")
        .args(&[
            "--log2-word-size=3",
            "--log2-root-size", &log2.to_string(),
            "--log2-leaf-size=12",
            "--input", &tmpfile.path().to_string_lossy()])
        .output()
        .expect("Failed to execute command");

    let cartesi_merkle_root = String::from_utf8(cartesi_merkle_root_output.stdout)
        .expect("Failed to read output");

    let _ = Command::new("ipfs")
        .args(&["--api", &ipfs_api, "pin", "add", cid])
        .output()
        .expect("Failed to execute command");

    println!("{}", json!({"cartesi_merkle_root":cartesi_merkle_root, "size":size}));

    Ok(())
}
