
use std::process::Command;
use std::fs;
use std::env;
use glob::glob;

fn main() {
    let api = env::var("IPFS_API").expect("IPFS_API not found");
    
    // Equivalent of 'mkdir -p /tmp/empty'
    fs::create_dir_all("/tmp/empty").unwrap();

    // Equivalent of 'ls -alR /data/prepopulate'
    let output = Command::new("ls")
        .arg("-alR")
        .arg("/data/prepopulate")
        .output()
        .expect("Failed to execute command");
    println!("{}", String::from_utf8_lossy(&output.stdout));

    // Equivalent of 'ipfs --api $IPFS_API add -Q --cid-version=1 -r /tmp/empty'
    let _ = Command::new("ipfs")
        .arg("--api")
        .arg(&api)
        .arg("add")
        .arg("-Q")
        .arg("--cid-version=1")
        .arg("-r")
        .arg("/tmp/empty")
        .output()
        .expect("Failed to execute command");

    // Equivalent of 'ipfs --api $IPFS_API add -Q --cid-version=1 /data/prepopulate/*'
    for entry in glob("/data/prepopulate/*").expect("Failed to read glob pattern") {
        match entry {
            Ok(path) => {
                let _ = Command::new("ipfs")
                    .arg("--api")
                    .arg(&api)
                    .arg("add")
                    .arg("-Q")
                    .arg("--cid-version=1")
                    .arg(path.to_str().unwrap())
                    .output()
                    .expect("Failed to execute command");
            },
            Err(e) => println!("{:?}", e),
        }
    }

    // Equivalent of 'for x in /data/prepopulate-car/*.car; do ipfs --api $IPFS_API dag import --stats < $x; done'
    for entry in glob("/data/prepopulate-car/*.car").expect("Failed to read glob pattern") {
        match entry {
            Ok(path) => {
                let _ = Command::new("ipfs")
                    .arg("--api")
                    .arg(&api)
                    .arg("dag")
                    .arg("import")
                    .arg("--stats")
                    .arg(path.to_str().unwrap())
                    .output()
                    .expect("Failed to execute command");
            },
            Err(e) => println!("{:?}", e),
        }
    }

    // Equivalent of 'for x in /data/ext-car/*.car; do ipfs --api $IPFS_API dag import --stats < $x; done'
    for entry in glob("/data/ext-car/*.car").expect("Failed to read glob pattern") {
        match entry {
            Ok(path) => {
                let _ = Command::new("ipfs")
                    .arg("--api")
                    .arg(&api)
                    .arg("dag")
                    .arg("import")
                    .arg("--stats")
                    .arg(path.to_str().unwrap())
                    .output()
                    .expect("Failed to execute command");
            },
            Err(e) => println!("{:?}", e),
        }
    }
}
