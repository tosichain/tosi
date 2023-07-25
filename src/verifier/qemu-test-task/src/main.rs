use std::process::Command;
use std::fs::File;
use std::os::unix::fs::PermissionsExt;
use std::thread;
use std::time::Duration;
use std::env;

fn main() -> std::io::Result<()> {
    env::set_var("IPFS_PATH", "/var/ipfs");

    let task_dir = "/opt/verifier";
    let input_image = format!("{}/input.bin", task_dir);
    let input_size = 128;

    println!("Generating output file...");

    std::fs::create_dir_all(&task_dir)?;
    {
        let file = File::create(&input_image)?;
        let mut perms = file.metadata()?.permissions();
        perms.set_mode(0o600);
        file.set_permissions(perms)?;
        file.set_len(input_size as u64)?;
    }

    println!("Created output file.");

    let ipfs_init = Command::new("ipfs")
        .args(&["init", "--profile=server", "--empty-repo"])
        .output()?;
    assert!(ipfs_init.status.success());

    println!("Initialized IPFS.");

    let ipfs_daemon = Command::new("ipfs")
        .args(&["daemon", "--offline"])
        .spawn()?;
    println!("IPFS daemon running with pid {}", ipfs_daemon.id());

    thread::sleep(Duration::from_secs(4));

    std::fs::create_dir_all("empty")?;

    println!("Created 'empty' directory.");

    let function_cid = Command::new("ipfs")
        .args(&["add", "--api", "/ip4/127.0.0.1/tcp/5001", "--cid-version=1", "-Q", &format!("{}/function.squashfs", task_dir)])
        .output()?
        .stdout;

    let function_cid = String::from_utf8(function_cid).expect("Failed to read output");
    println!("FUNCTION: {}", function_cid);

    let prev_output_cid = Command::new("ipfs")
        .args(&["add", "--api", "/ip4/127.0.0.1/tcp/5001", "-r", "--cid-version=1", "-Q", "empty"])
        .output()?
        .stdout;

    let prev_output_cid = String::from_utf8(prev_output_cid).expect("Failed to read output");

    let input_cid = Command::new("ipfs")
        .args(&["add", "--api", "/ip4/127.0.0.1/tcp/5001", "--cid-version=1", "-Q", &input_image])
        .output()?
        .stdout;

    let input_cid = String::from_utf8(input_cid).expect("Failed to read output");
    println!("INPUT: {}", input_cid);

    let _ = Command::new("bash")
        .args(&["./qemu-run-task/src/main.rs", &prev_output_cid, &input_cid, &function_cid])
        .env("IPFS_API", "/ip4/127.0.0.1/tcp/5001")
        .status()?;

    Ok(())
}
