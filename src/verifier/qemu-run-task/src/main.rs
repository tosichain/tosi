use std::env;
use std::fs::{self, OpenOptions};
use std::io::{self, Read, Seek, SeekFrom, Write};
use std::process::{Command, exit};
use std::path::Path;
use tempfile::tempdir;
use sha2::{Sha256, Digest};
use hex::encode;

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if args.len() < 4 {
        eprintln!("Usage: {} PREVIOUS_OUTPUT_CID INPUT_CID FUNCTION_CID", args[0]);
        exit(1);
    }

    let previous_output_cid = &args[1];
    let input_cid = &args[2];
    let function_cid = &args[3];

    let ipfs_api = env::var("IPFS_API").unwrap_or_else(|_| String::from("/ip4/127.0.0.1/tcp/5001"));

    let dir = tempdir()?;

    let task_dir = dir.path().to_str().unwrap().to_string();

    eprintln!("TASK_DIR={}", &task_dir);

    for (cid, name) in [(previous_output_cid, "previous_output.car"), (input_cid, "input.car")].iter() {
        let output = Command::new("ipfs")
            .args(&["--api", &ipfs_api, "dag", "export", cid])
            .output()
            .expect("Failed to execute command");

        fs::write(format!("{}/{}", task_dir, name), output.stdout)?;
    }

    for name in ["previous_output.car", "input.car"].iter() {
        let metadata = fs::metadata(format!("{}/{}", task_dir, name))?;
        let size = metadata.len();

        let mut file = OpenOptions::new()
            .write(true)
            .open(format!("{}/metadata.img", task_dir))?;
        write!(file, "{:016X}", size)?;

        file.seek(SeekFrom::End(0))?;
        file.write_all(&[0u8; 4096][..4096 - (size % 4096) as usize])?;
    }

    for (size, name) in [(2147483648, "previous_output.car"), (2147483648, "input.car"), (4096, "metadata.img")].iter() {
        let file = OpenOptions::new()
            .write(true)
            .open(format!("{}/{}", task_dir, name))?;
        file.set_len(*size)?;
    }

    let _output = Command::new("ipfs")
        .args(&["--api", &ipfs_api, "get", "-o", &format!("{}/function.img", task_dir), function_cid])
        .output()
        .expect("Failed to execute command");

    let _validator_root = "/opt/validator";
    let scratch_image = format!("{}/scratch.img", task_dir);
    let kernel = "/app/bzImage";
    let function_image = format!("{}/function.img", task_dir);
    let metadata_image = format!("{}/metadata.img", task_dir);
    let previous_output_image = format!("{}/previous_output.car", task_dir);
    let input_image = format!("{}/input.car", task_dir);
    let output_image = format!("{}/output.bin", task_dir);

    let kvm = if Path::new("/dev/kvm").exists() { "-enable-kvm" } else { "" };

    let mut command = Command::new("qemu-system-x86_64");
    command
        .arg("-nographic")
        .arg("-nodefaults")
        .arg("-no-reboot")
        .arg("-kernel")
        .arg(&kernel)
        .arg("-append")
        .arg(format!("console=ttyS0 init={} init_arg1={} init_arg2={} init_arg3={} init_arg4={} init_arg5={} init_arg6={}",
                     "/init",
                     &scratch_image,
                     &function_image,
                     &metadata_image,
                     &previous_output_image,
                     &input_image,
                     &output_image))
        .arg("-m")
        .arg("1024")
        .arg("-drive")
        .arg(format!("file={},format=raw", &scratch_image))
        .arg("-drive")
        .arg(format!("file={},format=raw", &function_image))
        .arg("-drive")
        .arg(format!("file={},format=raw", &metadata_image))
        .arg("-drive")
        .arg(format!("file={},format=raw", &previous_output_image))
        .arg("-drive")
        .arg(format!("file={},format=raw", &input_image))
        .arg("-drive")
        .arg(format!("file={},format=raw", &output_image))
        .arg(kvm)
        .arg("-cpu")
        .arg("host");

    let _ = command.output()?;

    let mut output = Vec::new();
    let mut file = OpenOptions::new().read(true).open(&output_image)?;
    file.read_to_end(&mut output)?;

    let mut hasher = Sha256::new();
    hasher.update(output);
    let result = hasher.finalize();
    eprintln!("OUTPUT_SHA256={}", encode(result));

    let output = Command::new("ipfs")
        .args(&["--api", &ipfs_api, "dag", "import", &output_image])
        .output()
        .expect("Failed to execute command");

    let binding = String::from_utf8(output.stdout)
        .expect("Failed to read output");

    let pinned_root = binding
        .lines()
        .filter_map(|line| line.split_whitespace().nth(2))
        .next()
        .unwrap_or_else(|| panic!("Failed to find pinned root"));

    let output_cid = pinned_root.split_whitespace().last().unwrap();

    eprintln!("OUTPUT_CID={}", output_cid);

    // dir.close()?;

    Ok(())
}
