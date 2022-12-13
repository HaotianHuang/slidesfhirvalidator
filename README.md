1. If it catches a mistake whilst parsing the object, it will throw an error into the notes for that slide then pause. 
2. There are two types of errors: try-catch errors (like with parsing object string) and validation errors (like resourceType field is missing!). Try-catch errors once logged halt execution. Validation errors do not halt execution even after logging. 
3. Assumes individual resource types. 
4. Test cases to write: multiple errors -> are they console logged. different patient resources. wrong object declaration. multiple fhir resources within one page. multiple pages. also no error test case. 
5. Validates always against structuredefinition/{resourceType}. If it is defined in the meta/profile, it uses that, otherwise generates profileUrl on its own. 
6. Change var -> const/let where possible
7. More test cases: when there are two FHIR objects in 1 text box. When there are multiple text boxes with FHIR objects