BEGIN;

ALTER TABLE company ADD COLUMN smrt_api_key text;

CREATE TABLE smrt_employee (
    company_id uuid NOT NULL REFERENCES company(id),
    external_id integer NOT NULL,
    name text NOT NULL,
    PRIMARY KEY (company_id, external_id)
);

INSERT INTO smrt_employee (company_id, external_id, name)
SELECT DISTINCT ON (company_id, external_id) company_id, external_id, employee_name
FROM ppoh_master
WHERE company_id IS NOT NULL AND external_id IS NOT NULL AND employee_name IS NOT NULL
ORDER BY company_id, external_id, date DESC NULLS LAST, id;

ALTER TABLE ppoh_master ADD CONSTRAINT ppoh_master_smrt_employee_fkey
    FOREIGN KEY (company_id, external_id) REFERENCES smrt_employee(company_id, external_id);

COMMIT;
