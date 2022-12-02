# qjsbootstrap

qjsbootstrap can be used to create cross-platform, distributable, standalone binaries written using JavaScript. Write your code in JavaScript (leveraging the [quickjs-libc APIs](https://github.com/suchipi/quickjs/blob/main/src/quickjs-libc/quickjs-libc.d.ts)), then append it to a copy of the `qjsbootstrap` binary, and now that binary runs your code.

```sh
$ ls
qjsbootstrap
$ ./qjsbootstrap
append UTF-8 encoded JavaScript to the end of this binary to change this binary into a program that executes that JavaScript code
$ cp qjsbootstrap my-program
$ echo 'console.log("hello!")' >> my-program
$ ls
qjsbootstrap
my-program
$ ./my-program
hello!
```

## Usage

First, compile QuickJS and qjsbootstrap:

- Make sure you have docker installed and running.
- Clone this repo and cd to its folder.
- Run `meta/docker/build-all.sh`

Then, write your script, and test it using the `qjs` binary for your OS:

```sh
$ echo 'console.log("hello!")' >> myscript.js
$ build/linux/bin/qjs myscript.js # replace build/linux with whatever is appropriate for your OS
hello!
```

Once you've verified your script works correctly, you can use `qjsbootstrap` to bundle it up.

Make copies of the `qjsbootstrap` binary for each OS:

```sh
$ cp build/darwin-arm64/bin/qjsbootstrap myscript-darwin-arm64
$ cp build/darwin-x86_64/bin/qjsbootstrap myscript-darwin-x86_64
$ cp build/linux-aarch64/bin/qjsbootstrap myscript-linux-aarch64
$ cp build/linux-amd64/bin/qjsbootstrap myscript-linux-amd64
$ cp build/windows-x86_64/bin/qjsbootstrap.exe myscript-windows-x86_64.exe
```

And then append your script to each binary:

```sh
$ cat myscript.js >> myscript-darwin-arm64
$ cat myscript.js >> myscript-darwin-x86_64
$ cat myscript.js >> myscript-linux-aarch64
$ cat myscript.js >> myscript-linux-amd64
$ cat myscript.js >> myscript-windows-x86_64.exe
```

Now test the binary for your platform:

```sh
$ ./myscript-linux-amd64 # run whichever one matches the OS you're on
hello!
```

If all works well, you're all set, and can distribute those `myscript-*` binaries.
