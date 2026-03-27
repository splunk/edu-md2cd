# Generating course descriptions

Use `@splunk-edu/md2cd` to convert course descriptions written in Markdown to PDFs. This guide is divided into two sections: 

* Using the CLI
* Using `manifest.json`


## Using the CLI 

You can generate one course description or recursively generate multiple course descriptions with `md2cd`.


### Generating one course description

Run `md2cd` with the path to your course directory: 
```sh
md2cd /path/to/course/directory
```

Use the `-H`, or `--html`, option to output HTML instead of a PDF: 
```sh
md2cd -H /path/to/course/directory
```

Note: this will only ouput to the terminal. If you want to save it to a file, use standard redirect: 
```sh
md2cd -H /path/to/course/directory > /path/to/output.html
```


### Generating all course descriptions in a directory

Use the recurisve and flat options to generate all course descriptions in a given directory. 

Use the `--recursive`, or `-r`, option to generate all course descriptions in their respective directories: 
```sh
md2cd -r path/to/course/repo
```

Use the `--flat`, or `-f`, option to flatten the generation of all course descriptions in a top-level directory. 

Combine these two options: 
```sh
md2cd -rf path/to/course/repo
```

This is the same as: 
```sh
md2cd -r -f path/to/course/repo
```

Or:
```sh
md2cd --recursive --flat path/to/course/repo
```

#### Specifying an output directory

Use the `--output` or `-o` option to specify an output directory (default: `./dist`):
```sh
md2cd --recursive --flat --output output/dir path/to/course/repo
```

Or: 
```sh
md2cd -rfo output/dir path/to/course/repo
```

Note: If you use the output option, you must pass the output directory as the next argument. Don't do this: 
```sh
md2cd -rfo input/dir
```

And don't do this: 
```sh
md2cd -rfo input/dir output/dir 
```

#### Test the output first with a dry run

You can also use the `--dry-run`, or `-d` option to see what files will be generated:
```sh
md2cd --recursive --flat --dry-run path/to/course/repo
```

Or: 
```sh
md2cd -rfd path/to/course/repo
```

#### Apply a theme to all course descriptions

Use the `--theme` or `-t` option to apply a theme to all course descriptions:
```sh
md2cd --recursive --flat --theme cisco path/to/course/repo
```

Or: 
```sh
md2cd -rft cisco path/to/course/repo
```


## Using manifest.json

We are migrating away from `metadata.yaml` files to `manifest.json` files. This new format allows us to customize use of the tool while easily catching syntax errors. In the context of `md2cd`, the `manifest.json` uses four top-level objects:

* `metadata`: Course metadata. Required.
* `input`: Custom input configurations. 
* `output`: Custom output configurations. 
* `plugins`: Additional functionality 

Here's an example

```json
{
  "metadata": {
    "courseId": "1234",
    "courseTitle": "Example Course",
    "slug": "example-course",
    "description": "Look at this!",
    "courseDeveloper": ["Buttercup Pwny", "Splunk EDU"],
    "modality": "ILT",
    "duration": "13.5 hours",
    "audience": {
      "role": ["sysadmin", "power user"],
      "internal": ["professional services", "sales engineer"],
      "external": ["customer-facing", "partners"]
    },
    "ga": "2025-11-01",
    "updated": "2026-01-21",
    "splunk": {
      "platform": {
        "deployment": "Cloud",
        "version": "10.2.1"
      }
    }
  },
  "input": {
    "courseDescription": "./custom-input.md"
  },
  "output": {
    "destination": "./custom",
    "pdfs": {
      "courseDescription": "custom-output-course-description.pdf"
    },
    "theme": "cisco"
  },
  "plugins": [
    {
      "name": "locale-jp",
      "translations": {
        "audience": "Splunkクラウド管理者",
        "duration": "18時間"
      }
    }
  ]
```


## Environment Variables

The `md2cd` tool supports the following environment variables:

* `LOG_LEVEL`: Set the logging level (`debug`, `info`, `warn`, `error`, `fatal`). Default: `debug` in development, `info` in production.
* `NO_EMOJI`: Set to `1` to disable emoji characters in log output. Useful for Windows terminals that don't render Unicode emojis correctly. Example:
  ```sh
  # Windows PowerShell
  $env:NO_EMOJI=1; npx md2cd ./
  
  # Windows Command Prompt
  set NO_EMOJI=1 && npx md2cd ./
  
  # Unix/macOS
  NO_EMOJI=1 npx md2cd ./
  ```


## Using metadata.yaml

The tool features a yaml-to-json migrator that will convert your existing `metadata.yaml` file to a `manifest.json` file. It's not backwards compatible, though, so you can't use the configurations availalable in the `manifest.json` in your `metadata.yaml`. If you want to use custom inputs and outputs, plugins, and themes, you will need to use a `manifest.json` file. 


## Using custom inputs

The `md2cd` tool expects to find a Markdown file ending with `-course-description.md` at the base of the course directory. You can override this and specify a custom input file and directory using the `courseDescription` key in the `input` object. For example: 
```json
  "input": {
    "courseDescription": "./path/to/custom/input.md"
  }
```

## Using custom outputs

The `md2cd` tool create a default `./dist` directory for its output. You can override this by specifying a custom output using the `destination` key. The tool also generates a defult file name for your course description. You can override this by using the `pdfs` object and the `courseDescription` key. Here's an example of both: 
```json
  "output": {
    "destination": "./path/to/custom/output/dir",
    "pdfs": {
      "courseDescription": "custom-filename.pdf"
    }
  }
```


## Using themes

The `md2cd` tool uses the Splunk EDU theme by default. You can override this by specifying a `theme` in the `output` object: 
```json
  "output": {
    "theme": "cisco"
  }
```


## Using plugins

The `md2cd` tool supports plugins. For example: 
```json
  "plugins": [
    {
      "name": "locale-jp",
      "translations": {
        "audience": "Splunkクラウド管理者",
        "duration": "18時間"
      }
    }
  ]
```










