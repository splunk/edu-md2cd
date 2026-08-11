# Schema migration

This tool was initially designed to use a `metadata.yaml`, which looked like this:

```yml
course_id: '1001'
course_title: 'Splunk Cloud Administration'
slug: 'sca'
version: '9.4'
course_developer: 'Splunk EDU'
format: 'Instructor-Led Training'
duration: '18 hr'
audience:
    - Splunk Cloud Administrators
updated: '2026-02-02'
output:
    - cd
```

Going forward we will use both a `metadata` and a `manifest` file and we need to ensure that the legacy `metadata.yaml` file is migrated to the new schema.

We do not need to migrate the legacy `manifest.json` files to the new schema. When and where it is in use will be updated manually or with a script.

These architectural changes need to be implemented:

- Separate the `metadata` into it's own `metadata.json/y*ml` file
- Migrate the legacy metadata to a new schema

## Separate the `metadata` into it's own `metadata.json/y*ml` file

Why?

- Separation of concerns: every course requires a `metadata` file, but not every course requires a `manifest` file. The `metadata` file contains, well, _metadata_, the _what_. The `manifest` file is used to control and custom the build process, the _how_.

How does this work?

- If there is only a `metadata` file in the course repo, then the tool uses the build defaults.
- The tool will use both a `metadata` file and a `manifest` file
- The tool supports both JSON and Y\*ML formats
- The default file format is Y\*ML
- The user can specify their preferred format using the `-m` option, for example:

```sh
md2app /path/to/course -m JSON
```

## Migrate the legacy metadata to a new schema

-Why?

- We refined and updated the metadata schema to accomplish (at least) two things:
    1. Use more accurate and descriptive keys
    2. Acoomodate customizations and edge cases

How does this work?

Here's an example of the new `metadata` schema:

```json
{
    "metadata": {
        "courseId": "EDU-1234",
        "projectId": "56-7890",
        "courseTitle": "Course Title",
        "slug": "course-title",
        "description": "Stuff you need to know!",
        "courseDeveloper": ["Buttercup Pwny", "Splunk EDU"],
        "format": [
            {
                "mode": "eLearning",
                "duration": "5 hours"
            }
        ],
        "roles": {
            "customer": ["sysadmin", "power user"],
            "internal": ["professional services", "sales engineer"]
        },
        "prerequisites": {
            "courses": [
                "Splunk Enterprise System Administration",
                "Troubleshooting Splunk Enterprise",
                "Splunk Enterprise Cluster Administration"
            ],
            "competencies": ["Linux chops", "Karate chops", "Underwater basket weaving"]
        },
        "ga": "2025-11-01",
        "updated": "2026-01-21",
        "splunk": {
            "platform": {
                "deployment": "Cloud",
                "version": "10.2.1"
            }
        }
    }
}
```

Note the following:

- Rather than `modality`, we now use a `format` field, which is an array of objects containing `mode` (the value formerly associated with `modality`) and `duration`. This allows us to accommodate multiple forrmats/modes.

- Rather than `audience`, we are now using a top-level `roles` field with `internal` and `customer` fields, rather than `external`. By definition, our external users are customers.

Ensure the following:

- The metadata parser expects `camelCase` regardless of the file type, either JSON or Y\*ML
- All tools use the same metadta schema and support both JSON and Y\*ML. Refer to `md2app` and `md2cd`. They are the source of truth. Both `md2rtfm` and `md2lab` need to be updated.
- All tools use `metadata.json` or `metadata.yml` and do not add the keyword `new` to the file. This is fine for temporary file swapping, but not as the final output.
