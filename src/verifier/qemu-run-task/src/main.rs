use std::env;
use std::fs::{self, OpenOptions};
use std::io::{self, Read, Seek, SeekFrom, Write};
use std::process::Command;
use std::path::Path;
use tempfile::tempdir;
use sha2::{Sha256, Digest};
use hex::encode;

fn main() -> io::Result<()> {
    // Collect arguments passed to the program
    let args: Vec<String> = env::args().collect();

    // print usage and exit when not enough arguments are passed
    if args.len() < 4 {
        eprintln!("Usage: {} PREVIOUS_OUTPUT_CID INPUT_CID FUNCTION_CID", args[0]);
        return Ok(());
    }
    
    // commandline arguments
    let previous_output_cid = &args[1];
    let input_cid = &args[2];
    let function_cid = &args[3];

    eprintln!("Previous output CID: {}", previous_output_cid);
    eprintln!("Input CID: {}", input_cid);
    eprintln!("Function CID: {}", function_cid);
    
    // ipfs endpoint.. default to localhost if not set
    let ipfs_api = env::var("IPFS_API").unwrap_or_else(|_| String::from("/ip4/127.0.0.1/tcp/5001"));

    eprintln!("IPFS API: {}", ipfs_api);

    // temporary dir
    let dir = tempdir()?;

    //temp dir to string
    let task_dir = dir.path().to_str().unwrap().to_string();

    eprintln!("Temporary directory: {}", &task_dir);

    // Fetch the files associated with the CIDs for previous output and input from IPFS, writing them to disk
    for (cid, name) in [(previous_output_cid, "previous_output.car"), (input_cid, "input.car")].iter() {
        let output = Command::new("ipfs")
            .args(&["--api", &ipfs_api, "dag", "export", cid])
            .output()?;

        eprintln!("Starting to write file {}", name);
        fs::write(format!("{}/{}", task_dir, name), output.stdout)?;
        eprintln!("Finished writing file {}", name);

        eprintln!("Fetched file {} with CID {}", name, cid);
    }

    //  Create a metadata image for each of the files, containing the size of the file and padding to reach a multiple of 4096 bytes
    // create metadata file
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(format!("{}/metadata.img", task_dir))?;

    // iterate over both files to store their sizes in the metadata image
    for name in ["previous_output.car", "input.car"].iter() {
        let metadata = fs::metadata(format!("{}/{}", task_dir, name))?;
        let size = metadata.len();

        eprintln!("Starting to write metadata for file {}", name);
        write!(file, "{:016X}", size)?;

        file.seek(SeekFrom::End(0))?;
        file.write_all(&[0u8; 4096][..4096 - (size % 4096) as usize])?;
        eprintln!("Finished writing metadata for file {}", name);
    }


    // Set the size of each image to the expected size, extending with zero bytes if necessary
    for (size, name) in [(2147483648, "previous_output.car"), (2147483648, "input.car"), (4096, "metadata.img")].iter() {
        eprintln!("start of setting the size for image {}", name);
        let file = OpenOptions::new()
            .write(true)
            .open(format!("{}/{}", task_dir, name))?;
        file.set_len(*size)?;

        eprintln!("end of setting the size for image {}", name);
    }

    // Fetch the function image from IPFS
    let _output = Command::new("ipfs")
        .args(&["--api", &ipfs_api, "get", "-o", &format!("{}/function.img", task_dir), function_cid])
        .output()?;

    eprintln!("Fetched function image from IPFS with CID {}", function_cid);

    // Create a scratch image of 2GiB
    eprintln!("start of creating scratch image");
    let file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(format!("{}/scratch.img", task_dir));
    
    let size_in_bytes = 2 * 1024 * 1024 * 1024;
    let file = file?;
    file.set_len(size_in_bytes)?;

    eprintln!("Created scratch image");


    // Set up paths for the function, metadata, previous output, and input images
    let kernel = "/app/bzImage";
    let function_image = format!("{}/function.img", task_dir);
    let metadata_image = format!("{}/metadata.img", task_dir);
    let previous_output_image = format!("{}/previous_output.car", task_dir);
    let input_image = format!("{}/input.car", task_dir);
    let output_image = format!("{}/output.bin", task_dir);
    let scratch_image = format!("{}/scratch.img", task_dir);

    eprintln!("Image paths set up");

    // Create an output image of 4096 bytes, filled with zeroes
    let output_size = 4096;
    let file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&output_image)?;

    file.set_len(output_size)?;

    eprintln!("Created output image");

    eprintln!("Previous output CID: {}", previous_output_cid);
    eprintln!("Function CID: {}", function_cid);
    eprintln!("Input CID: {}", input_cid);

    // Check if /dev/kvm exists
    let kvm_exists = Path::new("/dev/kvm").exists();

    if kvm_exists {
        let kvm = "-enable-kvm";

        // Set up command to run QEMU with KVM
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

        eprintln!("Command to run QEMU set up");

        // Execute QEMU command
        let output = command.output()?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            eprintln!("QEMU command failed: {}", stderr);
        } else {
            eprintln!("QEMU command executed");
        }
    } else {
        let kernel = "/app/bzImage-nokvm-q35";

        // Set up command to run QEMU without KVM
        let mut command = Command::new("qemu-system-x86_64");
        command
            .arg("-nographic")
            .arg("-no-reboot")
            .arg("-M")
            .arg("q35,accel=tcg")
            .arg("-m")
            .arg("512m")
            .arg("-cpu")
            .arg("max")
            .arg("-smp")
            .arg("cpus=1,cores=1,threads=1")
            .arg("-drive")
            .arg(format!("driver=raw,if=virtio,readonly=on,file={}", &function_image))
            .arg("-drive")
            .arg(format!("driver=raw,if=virtio,file={}", &output_image))
            .arg("-drive")
            .arg(format!("driver=raw,if=virtio,readonly=on,file={}", &previous_output_image))
            .arg("-drive")
            .arg(format!("driver=raw,if=virtio,cache=unsafe,file={}", &scratch_image))
            .arg("-drive")
            .arg(format!("driver=raw,if=virtio,readonly=on,file={}", &input_image))
            .arg("-drive")
            .arg(format!("driver=raw,if=virtio,readonly=on,file={}", &metadata_image))
            .arg("-kernel")
            .arg(kernel)
            .arg("-append")
            .arg("earlyprintk=ttyS0 console=ttyS0 reboot=t root=/dev/vda init=/qemu-init panic=1");

        eprintln!("Command to run QEMU set up");

        // Execute QEMU command
        let output = command.output()?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            eprintln!("QEMU command failed: {}", stderr);
        } else {
            eprintln!("QEMU command executed");
        }
    }

    // Read the result from the output image
    let mut output = Vec::new();
    let mut file = OpenOptions::new().read(true).open(&output_image)?;
    file.read_to_end(&mut output)?;

    // Compute the SHA-256 hash of the output
    let mut hasher = Sha256::new();
    hasher.update(output);
    let result = hasher.finalize();
    eprintln!("OUTPUT_HASH={}", encode(result));

    // Import the output image to IPFS
    let output = Command::new("ipfs")
        .args(&["--api", &ipfs_api, "dag", "import", &output_image])
        .output()?;
    
    // Extract the CID of the output from IPFS command output
    let mut output_cid = String::from_utf8(output.stdout).unwrap();
    let lines: Vec<&str> = output_cid.lines().collect();
    if lines.len() < 2 {
        panic!("Invalid output from ipfs dag import");
    }
    let cid_line = lines[lines.len() - 2];
    let cid_parts: Vec<&str> = cid_line.split_whitespace().collect();
    if cid_parts.len() < 3 {
        panic!("Invalid CID line: {}", cid_line);
    }
    output_cid = cid_parts[2].to_string();

    eprintln!("OUTPUT_CID={}", output_cid);
    eprintln!("Output image imported to IPFS");

    Ok(())
}
