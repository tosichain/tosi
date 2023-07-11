use std::process::{Command, exit};
use std::env;
use std::fs;
use serde_json::json;
use uuid::Uuid;

fn main() -> std::io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if args.len() != 2 {
        println!("Usage: {} CID", args[0]);
        exit(1);
    }

    let cid = &args[1];
    let ipfs_api = env::var("IPFS_API").unwrap_or_else(|_| String::from("/ip4/127.0.0.1/tcp/5001"));
    let timeout = env::var("TIMEOUT").unwrap_or_else(|_| String::from("1m"));

    let unique_id = Uuid::new_v4();
    let unique_path_str = format!("/tmp/{}", unique_id.to_string());

    let output = Command::new("ipfs")
        .args(&["--timeout", &timeout, "--api", &ipfs_api, "dag", "export", cid])
        .output()
        .expect("Failed to execute command");

    if !output.status.success() {
        println!("{}", json!({"error":"failed"}));
        exit(0);
    }

    fs::write(&unique_path_str, &output.stdout)?;

    let log2 = 31;
    let metadata = fs::metadata(&unique_path_str)?;
    let size = metadata.len();

    // let cartesi_merkle_root_output = Command::new("/app/merkle-tree-hash")
    //     .args(&[
    //         "--log2-word-size=3",
    //         "--log2-root-size", &log2.to_string(),
    //         "--log2-leaf-size=12",
    //         "--input", &unique_path_str])
    //     .output()
    //     .expect("Failed to execute command");

    // let mut cartesi_merkle_root = String::from_utf8(cartesi_merkle_root_output.stdout)
    //     .expect("Failed to read output");

    let cartesi_merkle_root = "00000000000000000000000000000000".to_string();
    
    let _ = Command::new("ipfs")
        .args(&["--api", &ipfs_api, "pin", "add", cid])
        .output()
        .expect("Failed to execute command");

    println!("{}", json!({"cartesi_merkle_root":cartesi_merkle_root, "size":size}));

    Ok(())
}
