# Generating course descriptions

Use `@splunk-edu/md2cd` to convert course descriptions written in Markdown to PDFs. This guide is divided into two sections: 

* Using the CLI
* Using `manifest.json`


## Using the Markdown template

This tool expects to find this comment in the Markdown template: 
```
<!-- ⚠️ PREREQUISITES RENDER HERE. DO NOT MOVE OR REMOVE THIS COMMENT ⚠️ -->
```

Read it and heed it! 

The prerequisites and the callout box featuring Format, Duration and Audience are generated from the metadata in your `manifest.json` file. The tool searches for this comment and renders these elements directly below it. If you remove this comment, your render will fail. If you move this comment, you'll break the design. 


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
    "courseId": "splunk-course",
    "projectId": "56-7890",
    "lmsId": "EDU-1234",
    "courseTitle": "Example Course",
    "slug": "example-course",
    "description": "Look at this!",
    "courseDeveloper": ["Buttercup Pwny", "Splunk EDU"],
    "format": [
      {
        "mode": "eLearning",
        "duration": "5 hour(s)"
      }
    ],
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


## Specifying prerequisites
Specify your prerequisites using the `metadata.prerequisites.courses` and `metadata.prerequisites.competencies` fields: 
```json
    "prerequisites": {
      "courses": [
        "Splunk Enterprise System Administration",
        "Troubleshooting Splunk Enterprise",
        "Splunk Enterprise Cluster Administration"
      ],
      "competencies": [
        "Linux chops",
        "Karate chops"
      ]
    },
```

If there are no prerequisites, enter `None` in either or both the `courses` and `competencies` arrays. This will render "None" in both lists on the PDF. 


## Using multiple formats

If there are multiple delivery methods for your course, you can specify that in the `format` array by adding additional objects: 
```json
    "format": [
      {
        "mode": "eLearning",
        "duration": "5 hours"
      },
      {
        "mode": "Instructor-led training",
        "duration": "13.5 hours"
      }
    ],
```

These are the available options for `mode`:
* "Instructor-led training"
* "eLearning"
* "eLearning with lab exercises"
* "Blended"
* "Lab experience"

⚠️ These values must be an exact match for standardization across course descriptions. 

Use `hour` or `hours`. Do not use the abbreviation `hrs`. 

Note the following: 
* If more than one format is specified, all modes will be combined in one PDF, listed in a table in the callout box. 
* You can override this default behavior by configuring the `output` field. See below. 


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

If you specified multiple formats, `md2cd`will output a combined PDF by default. You can override this behavior using the `output.pdfs.courseDescription.format` field and the value `split`: 
```json
  "output": {
    "pdfs": {
      "courseDescription": {
        "format": "split"
      }
    }
  }
```

This will generate a separate PDF for each format using the slug as the title with the mode appended.

If you want to configure which formats are combined and which are split, you can pass `output.pdfs.courseDescription` an array of objects specifying this using the `filename` and `includes` fields: 
```json
  "output": {
    "pdfs": {
      "courseDescription": [
        {
          "filename": "custom-blended.pdf",
          "includes": ["Instructor-led training", "eLearning"]
        },
        {
          "filename": "custom-eln.pdf",
          "includes": ["eLearning with lab exercises"]
        }
      ]
    }
  }
```

You must specify an output for each format listed in your metadata and the modes listed in `includes` must match. 


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










