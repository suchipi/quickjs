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

Then, write your script, and test it using the `qjs.target` binary for your OS:

```sh
$ echo 'console.log("hello!")' >> myscript.js
$ build/linux/qjs.target myscript.js # replace build/linux with whatever is appropriate for your OS
hello!
```

Once you've verified your script works correctly, you can use `qjsbootstrap` to bundle it up.

Make copies of the `qjsbootstrap.target` binary for each OS:

```sh
$ cp build/linux/qjsbootstrap.target myscript-linux
$ cp build/darwin-x86/qjsbootstrap.target myscript-darwin-x86
$ cp build/darwin-arm/qjsbootstrap.target myscript-darwin-arm
$ cp build/windows/qjsbootstrap.target myscript-windows.exe
```

And then append your script to each binary:

```sh
$ cat myscript.js >> myscript-linux
$ cat myscript.js >> myscript-darwin-x86
$ cat myscript.js >> myscript-darwin-arm
$ cat myscript.js >> myscript-windows.exe
```

Now test the binary for your platform:

```sh
$ myscript-linux # run whichever one matches the OS you're on
hello!
```

If all works well, you're all set, and can distribute those `myscript-*` binaries.
