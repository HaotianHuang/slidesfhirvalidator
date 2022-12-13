
> slidesfhirvalidator is an Apps Script responsible for validating JSON FHIR objects in Google Slides
> 
> If you have feedback on how I can make this code better, please let me know!

## Features

1. Scans through all text boxes in the presentation. 
2. Works if there are multiple text boxes on one slide.
3. FHIR .json needn't be the only thing in the text box.
4. Appends error messages to speaker notes section.

## Usage

1. Go to Google's App Script [portal](https://script.google.com/home/).
2. Start a new project.
3. Rename default `.gs` file to `Validate.gs` and save. 
4. Configure desired* presentationId ([how?](https://developers.google.com/slides/api/guides/overview)).
5. Run (and accept permissions).

\* demo.pptx can be used as an example slides if you upload it to drive and convert it to a Google Slides document.

Quirks of the system

1. If there are two text boxes on one slide, it will query server separately but put the error messages (if existing) together in the same note section.

Limitations

1. Only works with .json.
2. Does NOT take into account meta.profile
3. Very dependent on resourceType.
4. Does NOT work with images.
5. Not tested with extensive amount of examples and resource types.
6. No method of specifying IG or profile, defaults to what I believe is US core.
