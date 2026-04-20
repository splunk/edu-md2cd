Update how this tool parses the `duration` field in the `manifest.json` according to the following specifications:

* The parser accepts both a string or an object containing fields with straing values. 

        Here's an example of a string: 
        ```
        "duration": "10 hour(s)",
        ```

        Here's an example of an object: 
        ```
        "duration": {
                "ilt": "9 hour(s)",
                "eln": "1 hour(s)",
                "lab": "optional"
        }
        ```

        - The fields list above are the only accepted values (for now, we may add more in the future)

        - If the value of `duration` is an object, it will render the values as a bulleted list

* TODO

