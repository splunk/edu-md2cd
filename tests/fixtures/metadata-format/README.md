Update this tool to use a `format` field rather than a `modality` field. 

The `format` field encapsulates the `mode` and the `duration`. 

The value previously stored in `modality` is now associated with `mode`.

The `duration` is now nested under `format`. 

Here's the previous approach: 
```
{
  "metadata": {
    "courseId": "1234",
    "courseTitle": "Using Prerequisites in Metadata",
    "slug": "metaprereqs",
    "description": "Stuff you need to know!",
    "courseDeveloper": ["Buttercup Pwny", "Splunk EDU"],
    "modality": "Instructor-led",
    "duration": "13.5 hours",
    "audience": {
      "role": ["sysadmin", "power user"],
      "internal": ["professional services", "sales engineer"],
      "external": ["customer-facing", "partners"]
    },
    "prerequisites": {
      "courses": [
        "Splunk Enterprise System Administration",
        "Troubleshooting Splunk Enterprise",
        "Splunk Enterprise Cluster Administration"
      ],
      "competencies": [
        "Linux chops",
        "Karate chops",
        "Underwater basket weaving"
      ]
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

Here's the new approach: 
```
{
  "metadata": {
    "courseId": "1234",
    "courseTitle": "Using format in metadata",
    "slug": "format-metadata",
    "description": "Stuff you need to know!",
    "courseDeveloper": ["Buttercup Pwny", "Splunk EDU"],
    "format": [
      {
        "mode": "eLearning",
        "duration": "5 hour(s)"
      },
      {
        "mode": "Instructor-led training",
        "duration": "13.5 hour(s)"
      }
    ],
    "audience": {
      "role": ["sysadmin", "power user"],
      "internal": ["professional services", "sales engineer"],
      "external": ["customer-facing", "partners"]
    },
    "prerequisites": {
      "courses": [
        "Splunk Enterprise System Administration",
        "Troubleshooting Splunk Enterprise",
        "Splunk Enterprise Cluster Administration"
      ],
      "competencies": [
        "Linux chops",
        "Karate chops",
        "Underwater basket weaving"
      ]
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

If there are multiple objects listed under `format`, the tool needs to generate separate PDFs for each. The example above uses: 
```
    "format": [
      {
        "mode": "eLearning",
        "duration": "5 hour(s)"
      },
      {
        "mode": "Instructor-led training",
        "duration": "13.5 hour(s)"
      }
    ],
```

The tool will parse this metadata and generate two PDFs:
* course-slug-elearning.pdf
* course-slug-instructor-led-training.pdf

If multiple formats are specified and custom output is also specified, then `pdfs.courseDescription` field must reflect the `metadata.format` field:
```
  "output": {
    "destination": "./custom-directory",
    "pdfs": {
      "courseDescription": [
                {
                        "mode": "eLearning",
                        "title": "custom-filename-eln.pdf"
                },
                {
                        "mode": "Instructor-led training",
                        "title": "custom-filename-ilt.pdf"
                }
        ]
    }
  }
```


