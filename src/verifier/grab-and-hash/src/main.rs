use std::process::{Command, exit, Stdio};
use std::env;
use std::fs;
use uuid::Uuid;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() != 2 {
        eprintln!("Please provide the hash as an argument");
        exit(1);
    }

    let hash = &args[1];

    let unique_id = Uuid::new_v4();
    let tmpfile_path = format!("/tmp/{}", unique_id.to_string());

    let ipfs_timeout = env::var("TIMEOUT").expect("TIMEOUT is not set");
    let ipfs_api = env::var("IPFS_API").expect("IPFS_API is not set");

    let status = Command::new("ipfs")
        .arg("--timeout")
        .arg(&ipfs_timeout)
        .arg("--api")
        .arg(&ipfs_api)
        .arg("get")
        .arg("-o")
        .arg(&tmpfile_path)
        .arg(&hash)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .expect("Failed to run ipfs command");

    if !status.success() {
        println!("{{\"error\":\"failed\"}}");
        exit(0);
    }

    let metadata = fs::metadata(&tmpfile_path).unwrap();
    let size = metadata.len();

    let log2 = "31";

    let output = Command::new("/app/merkle-tree-hash")
        .arg("--log2-word-size=3")
        .arg("--log2-root-size")
        .arg(&log2)
        .arg("--log2-leaf-size=12")
        .arg("--input")
        .arg(&tmpfile_path)
        .output()
        .expect("Failed to run merkle-tree-hash command");

    let cartesi_merkle_root = String::from_utf8(output.stdout).unwrap().trim().to_string();

    let _ = Command::new("ipfs")
        .arg("--api")
        .arg(&ipfs_api)
        .arg("pin")
        .arg("add")
        .arg(&hash)
        .status()
        .expect("Failed to run ipfs pin add command");

    println!("{{\"cartesi_merkle_root\":\"{}\",\"size\":\"{}\"}}", cartesi_merkle_root, size);
}
