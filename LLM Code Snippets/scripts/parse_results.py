"""
parse_results.py
----------------
Reads every raw JSON file under results/raw/ and produces one master CSV:
    results/csv/all_findings.csv

One row per finding.  Columns:
    llm, language, task_name, condition, tool,
    rule_id, cwe_id, cwe_description, severity, is_security, is_quality_only,
    line_number, description

Directory layout:
    LLM Code Snippets/
        results/
            raw/          <- reads from here  (written by scan_all.py)
            csv/          <- writes all_findings.csv here
        scripts/
            parse_results.py   <- this file
"""

import csv
import json
import re
import pathlib

ROOT    = pathlib.Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "results" / "raw"
CSV_DIR = ROOT / "results" / "csv"
CSV_DIR.mkdir(parents=True, exist_ok=True)

# =============================================================================
# CWE DESCRIPTIONS  (single source of truth used by all three tools)
# =============================================================================

CWE_DESCRIPTIONS = {
    # Input / injection
    "CWE-20":   "Improper Input Validation",
    "CWE-22":   "Path Traversal",
    "CWE-59":   "Improper Link Resolution / Symlink Attack",
    "CWE-74":   "Improper Neutralization of Special Elements (Injection)",
    "CWE-77":   "Command Injection (Generic)",
    "CWE-78":   "OS Command Injection",
    "CWE-79":   "Cross-Site Scripting (XSS)",
    "CWE-80":   "Basic XSS (HTML Injection)",
    "CWE-88":   "Argument Injection",
    "CWE-89":   "SQL Injection",
    "CWE-90":   "LDAP Injection",
    "CWE-91":   "XML Injection",
    "CWE-93":   "CRLF / HTTP Response Splitting",
    "CWE-94":   "Code Injection / Debug Exposure",
    "CWE-95":   "Dynamic Code Execution (eval)",
    "CWE-96":   "Static Code Injection",
    "CWE-98":   "Remote / Local File Inclusion",
    "CWE-113":  "HTTP Response Splitting",
    "CWE-116":  "Improper Encoding or Escaping",
    "CWE-117":  "Log Injection",
    "CWE-119":  "Buffer Overflow (Improper Memory Operation)",
    "CWE-120":  "Buffer Copy without Checking Size (Classic Buffer Overflow)",
    "CWE-134":  "Use of Externally-Controlled Format String",
    "CWE-190":  "Integer Overflow or Wraparound",
    "CWE-200":  "Exposure of Sensitive Information",
    "CWE-208":  "Observable Timing Discrepancy (Timing Attack)",
    "CWE-209":  "Information Exposure via Error Messages",
    "CWE-250":  "Execution with Unnecessary Privileges",
    "CWE-255":  "Credentials Management Errors (Password in URL etc.)",
    "CWE-259":  "Use of Hard-coded Password",
    "CWE-269":  "Improper Privilege Management",
    "CWE-275":  "Permission Issues",
    "CWE-276":  "Incorrect Default Permissions",
    "CWE-284":  "Improper Access Control",
    "CWE-285":  "Improper Authorization",
    "CWE-287":  "Improper Authentication",
    "CWE-295":  "Improper Certificate Validation",
    "CWE-296":  "Improper Following of Certificate Chain of Trust",
    "CWE-297":  "Improper Validation of Certificate with Host Mismatch",
    "CWE-306":  "Missing Authentication for Critical Function",
    "CWE-307":  "Improper Restriction of Authentication Attempts",
    "CWE-311":  "Missing Encryption of Sensitive Data",
    "CWE-312":  "Cleartext Storage of Sensitive Information",
    "CWE-313":  "Cleartext Storage in a File or on Disk",
    "CWE-319":  "Cleartext Transmission of Sensitive Information",
    "CWE-320":  "Key Management Errors",
    "CWE-321":  "Use of Hard-coded Cryptographic Key",
    "CWE-322":  "Key Exchange without Entity Authentication",
    "CWE-323":  "Reusing a Nonce or Key Pair in Encryption",
    "CWE-324":  "Use of a Key Past its Expiration Date",
    "CWE-325":  "Missing Required Cryptographic Step",
    "CWE-326":  "Inadequate Encryption Strength",
    "CWE-327":  "Use of a Broken or Risky Cryptographic Algorithm",
    "CWE-328":  "Reversible One-Way Hash",
    "CWE-329":  "Not Using a Random IV with CBC Mode",
    "CWE-330":  "Use of Insufficiently Random Values",
    "CWE-331":  "Insufficient Entropy",
    "CWE-332":  "Insufficient Entropy in PRNG",
    "CWE-335":  "Incorrect Usage of Seeds in Pseudo-Random Number Generator",
    "CWE-336":  "Same Seed in Pseudo-Random Number Generator",
    "CWE-338":  "Use of Cryptographically Weak PRNG",
    "CWE-340":  "Generation of Predictable Numbers or Identifiers",
    "CWE-345":  "Insufficient Verification of Data Authenticity",
    "CWE-346":  "Origin Validation Error (CORS)",
    "CWE-347":  "Improper Verification of Cryptographic Signature (JWT)",
    "CWE-352":  "Cross-Site Request Forgery (CSRF)",
    "CWE-359":  "Exposure of Private Personal Information",
    "CWE-362":  "Race Condition (Concurrent Resource Use)",
    "CWE-367":  "TOCTOU Race Condition",
    "CWE-377":  "Insecure Temporary File",
    "CWE-378":  "Creation of Temporary File With Insecure Permissions",
    "CWE-384":  "Session Fixation",
    "CWE-385":  "Covert Timing Channel",
    "CWE-390":  "Detection of Error Condition Without Action (Empty Catch)",
    "CWE-400":  "Uncontrolled Resource Consumption (DoS)",
    "CWE-401":  "Memory Leak",
    "CWE-407":  "Algorithmic Complexity (ReDoS-related)",
    "CWE-416":  "Use After Free",
    "CWE-425":  "Direct Request / Forced Browsing",
    "CWE-426":  "Untrusted Search Path",
    "CWE-427":  "Uncontrolled Search Path Element",
    "CWE-434":  "Unrestricted File Upload",
    "CWE-444":  "HTTP Request / Response Smuggling",
    "CWE-470":  "Unsafe Reflection (Externally-Controlled Class Selection)",
    "CWE-476":  "NULL Pointer Dereference",
    "CWE-489":  "Leftover Debug Code",
    "CWE-494":  "Download of Code Without Integrity Check",
    "CWE-502":  "Deserialization of Untrusted Data",
    "CWE-521":  "Weak Password Requirements",
    "CWE-522":  "Insufficiently Protected Credentials",
    "CWE-523":  "Unprotected Transport of Credentials",
    "CWE-524":  "Use of Cache Containing Sensitive Information",
    "CWE-532":  "Insertion of Sensitive Information into Log File",
    "CWE-538":  "File and Directory Information Exposure",
    "CWE-540":  "Inclusion of Sensitive Information in Source Code",
    "CWE-548":  "Exposure of Information Through Directory Listing",
    "CWE-601":  "Open Redirect",
    "CWE-605":  "Multiple Binds to the Same Port (Bind-All Interfaces)",
    "CWE-611":  "XML External Entity Injection (XXE)",
    "CWE-614":  "Sensitive Cookie Without Secure Flag",
    "CWE-615":  "Sensitive Information in Source Code Comments",
    "CWE-639":  "Authorization Bypass Through User-Controlled Key (IDOR)",
    "CWE-643":  "XPath Injection",
    "CWE-644":  "Improper Neutralization of HTTP Headers",
    "CWE-668":  "Exposure of Resource to Wrong Sphere",
    "CWE-673":  "External Influence of Sphere Definition",
    "CWE-693":  "Protection Mechanism Failure (Missing Security Headers)",
    "CWE-732":  "Incorrect Permission Assignment for Critical Resource",
    "CWE-776":  "Improper Restriction of Recursive Entity References (XML Bomb)",
    "CWE-798":  "Use of Hard-coded Credentials",
    "CWE-829":  "Inclusion from Untrusted Control Sphere",
    "CWE-830":  "Inclusion of Web Functionality from an Untrusted Source",
    "CWE-862":  "Missing Authorization",
    "CWE-863":  "Incorrect Authorization",
    "CWE-915":  "Improperly Controlled Modification of Dynamically-Determined Attributes (Mass Assignment)",
    "CWE-916":  "Use of Password Hash With Insufficient Computational Effort",
    "CWE-918":  "Server-Side Request Forgery (SSRF)",
    "CWE-943":  "NoSQL Injection",
    "CWE-1004": "Sensitive Cookie Without HttpOnly Flag",
    "CWE-1021": "Improper Restriction of Rendered UI Layers (Clickjacking)",
    "CWE-1188": "Insecure Default Initialization of Resource",
    "CWE-1275": "Sensitive Cookie with Improper SameSite Attribute",
    "CWE-1321": "Prototype Pollution",
    "CWE-1333": "Inefficient Regular Expression (ReDoS)",
}

# CWE IDs that are quality / reliability issues, not security findings
QUALITY_ONLY_CWES = {None, "CWE-16"}

# Severity normalisation across all three tools
SEVERITY_MAP = {
    # Bandit
    "HIGH": "HIGH", "MEDIUM": "MEDIUM", "LOW": "LOW",
    # Semgrep
    "ERROR": "HIGH", "WARNING": "MEDIUM", "INFO": "LOW",
    # SonarQube
    "BLOCKER": "HIGH", "CRITICAL": "HIGH",
    "MAJOR": "MEDIUM", "MINOR": "LOW",
}


# =============================================================================
# BANDIT  -- complete plugin list with CWE mapping
# Source: https://bandit.readthedocs.io/en/latest/plugins/index.html
# =============================================================================

BANDIT_TO_CWE = {

    # -- B1xx  General / miscellaneous ----------------------------------------
    # B101 assert_used: not mapped -- assert removal is a quality concern
    "B102": "CWE-78",    # exec_used -- OS Command Injection
    "B103": "CWE-732",   # set_bad_file_permissions -- incorrect permissions
    "B104": "CWE-605",   # hardcoded_bind_all_interfaces (0.0.0.0)
    "B105": "CWE-259",   # hardcoded_password_string
    "B106": "CWE-259",   # hardcoded_password_funcarg
    "B107": "CWE-259",   # hardcoded_password_default
    "B108": "CWE-377",   # hardcoded_tmp_directory
    "B109": "CWE-522",   # password_config_option_not_marked_secret
    "B110": "CWE-390",   # try_except_pass
    "B111": "CWE-250",   # execute_with_run_as_root=True
    "B112": "CWE-390",   # try_except_continue
    "B113": "CWE-400",   # request_without_timeout (DoS)

    # -- B2xx  Application / framework ----------------------------------------
    "B201": "CWE-94",    # flask_debug_true -- code/info exposure
    "B202": "CWE-22",    # tarfile_unsafe_members -- path traversal (Zip Slip)

    # -- B3xx  Hashing / crypto primitives ------------------------------------
    "B301": "CWE-502",   # pickle.loads
    "B302": "CWE-502",   # marshal.loads
    "B303": "CWE-327",   # MD5 / SHA1 via hashlib
    "B304": "CWE-327",   # Weak cipher (DES, RC2, RC4, Blowfish)
    "B305": "CWE-327",   # Weak cipher mode (ECB)
    "B306": "CWE-377",   # mktemp race condition
    "B307": "CWE-78",    # eval()
    "B308": "CWE-79",    # Django mark_safe
    "B310": "CWE-601",   # urllib.urlopen with arbitrary URL
    "B311": "CWE-330",   # random module (non-cryptographic)
    "B312": "CWE-319",   # telnetlib (cleartext)
    "B313": "CWE-611",   # xml.etree.ElementTree
    "B314": "CWE-611",   # xml.etree.cElementTree
    "B315": "CWE-611",   # xml.etree.ElementTree iterparse
    "B316": "CWE-611",   # xml.etree.cElementTree iterparse
    "B317": "CWE-611",   # xml.sax
    "B318": "CWE-611",   # xml.dom.minidom
    "B319": "CWE-611",   # xml.dom.pulldom
    "B320": "CWE-611",   # lxml
    "B321": "CWE-319",   # ftplib (cleartext)
    "B322": "CWE-78",    # input() Python 2
    "B323": "CWE-295",   # unverified SSL context
    "B324": "CWE-327",   # hashlib md5/sha1 direct call
    "B325": "CWE-330",   # os.urandom misuse

    # -- B4xx  Import checks --------------------------------------------------
    "B401": "CWE-319",   # telnet import
    "B402": "CWE-319",   # ftplib import
    "B403": "CWE-502",   # pickle import
    "B404": "CWE-78",    # subprocess import (informational)
    "B405": "CWE-611",   # xml.etree import
    "B406": "CWE-611",   # xml.sax import
    "B407": "CWE-611",   # xml.expat import
    "B408": "CWE-611",   # xml.dom import
    "B409": "CWE-611",   # xml.minidom import
    "B410": "CWE-611",   # lxml import
    "B411": "CWE-611",   # xmlrpclib import
    "B412": "CWE-78",    # httpoxy import
    "B413": "CWE-327",   # pycrypto (deprecated)
    "B414": "CWE-327",   # pycryptodome (informational)
    "B415": "CWE-295",   # pyghmi cleartext
    "B416": "CWE-502",   # shelve (pickle-backed)
    "B417": "CWE-78",    # pexpect.spawn with shell commands

    # -- B5xx  TLS / SSL / crypto API -----------------------------------------
    "B501": "CWE-295",   # requests verify=False
    "B502": "CWE-326",   # ssl.wrap_socket() bad version
    "B503": "CWE-326",   # ssl SSLv2/SSLv3
    "B504": "CWE-326",   # ssl no version set
    "B505": "CWE-326",   # weak cryptographic key size
    "B506": "CWE-20",    # yaml.load() without Loader
    "B507": "CWE-295",   # paramiko -- no host key verification
    "B508": "CWE-326",   # SNMP insecure version
    "B509": "CWE-326",   # SNMP weak cryptography

    # -- B6xx  Injection / process execution ----------------------------------
    "B601": "CWE-78",    # paramiko shell injection
    "B602": "CWE-78",    # subprocess.Popen shell=True
    "B603": "CWE-78",    # subprocess without shell (informational)
    "B604": "CWE-78",    # function call with shell=True
    "B605": "CWE-78",    # start_process_with_a_shell
    "B606": "CWE-78",    # start_process_with_no_shell
    "B607": "CWE-78",    # start_process_with_partial_path
    "B608": "CWE-89",    # hardcoded SQL expressions
    "B609": "CWE-78",    # Linux wildcard injection
    "B610": "CWE-89",    # Django .extra() SQL
    "B611": "CWE-89",    # Django RawSQL
    "B612": "CWE-78",    # logging.config with external data

    # -- B7xx  Templates / XSS ------------------------------------------------
    "B701": "CWE-94",    # Jinja2 autoescape=False
    "B702": "CWE-79",    # Mako templates (XSS)
    "B703": "CWE-79",    # Django mark_safe filter
}


# =============================================================================
# SEMGREP  -- rule-ID fragment -> CWE
# Matched case-insensitively; longest / most-specific fragment wins.
# =============================================================================

SEMGREP_RULE_TO_CWE = {

    # -- Flask ----------------------------------------------------------------
    "flask.debug.debug-flask":                        "CWE-94",
    "flask.security.audit.debug-enabled":             "CWE-94",
    "flask.security.audit.secure-set-cookie":         "CWE-614",
    "flask.security.audit.wtf-csrf-disabled":         "CWE-352",
    "flask.security.audit.harcoded-config":           "CWE-798",
    "flask.security.audit.hardcoded-config":          "CWE-798",
    "flask.security.audit.insecure-deserialization":  "CWE-502",
    "flask.security.audit.unescaped-template":        "CWE-79",
    "flask.security.audit.render-template-string":    "CWE-94",
    "flask.security.injection.taint-flask":           "CWE-89",

    # -- Django ---------------------------------------------------------------
    "django.security.audit.unvalidated-password":     "CWE-521",
    "django.security.audit.csrf-exempt":              "CWE-352",
    "django.security.audit.no-csrf-exempt":           "CWE-352",
    "django.security.audit.raw-query":                "CWE-89",
    "django.security.audit.extra-used":               "CWE-89",
    "django.security.audit.unsafe-regex":             "CWE-1333",
    "django.security.audit.xss-html":                 "CWE-79",
    "django.security.injection.tainted-sql-string":   "CWE-89",
    "django.security.audit.secure-cookie":            "CWE-614",
    "django.security.audit.httponly-cookie":          "CWE-1004",
    "django.security.audit.no-secret-key":            "CWE-798",
    "django.security.audit.open-redirect":            "CWE-601",
    "django.security.audit.debug-true":               "CWE-489",
    "django.security.audit.model-form-full-clean":    "CWE-20",

    # -- Express / Node -------------------------------------------------------
    "express.security.audit.express-check-csurf":     "CWE-352",
    "express.security.audit.missing-helmet":          "CWE-693",
    "express.security.audit.hardcoded-secret":        "CWE-798",
    "express.security.audit.jwt-hardcode":            "CWE-798",
    "express.web.cors-default-config":                "CWE-346",
    "express.security.audit.directory-traversal":     "CWE-22",
    "express.security.audit.insecure-cookie":         "CWE-614",
    "express.security.audit.cookie-session-default":  "CWE-1188",
    "express.security.audit.open-redirect":           "CWE-601",
    "javascript.express.security":                    "CWE-16",   # generic fallback
    "javascript.browser.security.insecure-document":  "CWE-79",
    "javascript.browser.security.eval-detected":      "CWE-95",
    "javascript.lang.security.audit.prototype-pollution": "CWE-1321",
    "javascript.jose.security":                       "CWE-347",
    "javascript.jsonwebtoken.security":               "CWE-347",
    "javascript.axios.security":                      "CWE-295",
    "javascript.node.security.audit.vm-injection":    "CWE-94",
    "javascript.node.security.audit.path-traversal":  "CWE-22",
    "javascript.node.security.audit.sql-injection":   "CWE-89",

    # -- SQL / NoSQL injection -------------------------------------------------
    "sqlalchemy-execute-injection":                   "CWE-89",
    "sql-injection":                                  "CWE-89",
    "tainted-sql-string":                             "CWE-89",
    "string-formatted-query":                         "CWE-89",
    "raw-sql":                                        "CWE-89",
    "nosql-injection":                                "CWE-943",
    "mongodb-injection":                              "CWE-943",
    "mongo-taint":                                    "CWE-943",

    # -- XSS / HTML injection -------------------------------------------------
    "xss":                                            "CWE-79",
    "html-injection":                                 "CWE-79",
    "dangerously-set-inner-html":                     "CWE-79",
    "innerhtml":                                      "CWE-79",
    "document-write":                                 "CWE-79",
    "unescaped-output":                               "CWE-79",
    "reflected-xss":                                  "CWE-79",
    "stored-xss":                                     "CWE-79",

    # -- Path traversal / symlinks --------------------------------------------
    "path-traversal":                                 "CWE-22",
    "tainted-path":                                   "CWE-22",
    "file-path-injection":                            "CWE-22",
    "directory-traversal":                            "CWE-22",
    "zip-slip":                                       "CWE-22",
    "symlink-attack":                                 "CWE-59",
    "symlink-following":                              "CWE-59",

    # -- Command injection / exec ---------------------------------------------
    "command-injection":                              "CWE-78",
    "os-command-injection":                           "CWE-78",
    "dangerous-subprocess-use":                       "CWE-78",
    "shell-true":                                     "CWE-78",
    "exec-use":                                       "CWE-78",
    "unsafe-exec":                                    "CWE-78",
    "eval-use":                                       "CWE-95",
    "code-exec":                                      "CWE-94",

    # -- Template injection / SSTI --------------------------------------------
    "template-injection":                             "CWE-94",
    "ssti":                                           "CWE-94",
    "server-side-template":                           "CWE-94",
    "render-template-string":                         "CWE-94",

    # -- SSRF -----------------------------------------------------------------
    "ssrf":                                           "CWE-918",
    "tainted-url-host":                               "CWE-918",
    "server-side-request":                            "CWE-918",
    "unvalidated-url":                                "CWE-918",

    # -- Cryptographic weaknesses ---------------------------------------------
    "insecure-hash-algorithms":                       "CWE-327",
    "weak-hash":                                      "CWE-327",
    "md5-use":                                        "CWE-328",
    "sha1-use":                                       "CWE-328",
    "ecb-mode":                                       "CWE-327",
    "broken-crypto":                                  "CWE-327",
    "weak-cipher":                                    "CWE-327",
    "des-use":                                        "CWE-327",
    "rc4-use":                                        "CWE-327",
    "weak-random":                                    "CWE-330",
    "math-random":                                    "CWE-330",
    "insecure-random":                                "CWE-330",
    "predictable-seed":                               "CWE-335",
    "insufficient-entropy":                           "CWE-331",
    "no-iv":                                          "CWE-329",
    "static-iv":                                      "CWE-329",

    # -- Hard-coded secrets ---------------------------------------------------
    "hardcoded-secret":                               "CWE-798",
    "hardcoded-password":                             "CWE-259",
    "hardcoded-jwt":                                  "CWE-798",
    "jwt-hardcode":                                   "CWE-798",
    "hardcoded-api-key":                              "CWE-798",
    "hardcoded-credentials":                          "CWE-798",
    "hardcoded-token":                                "CWE-798",
    "hardcoded-key":                                  "CWE-321",
    "secret-in-source":                               "CWE-540",
    "sensitive-in-comment":                           "CWE-615",
    "password-in-url":                                "CWE-255",
    "credentials-in-url":                             "CWE-255",

    # -- Authentication / session / JWT / CORS --------------------------------
    "csrf":                                           "CWE-352",
    "no-csrf":                                        "CWE-352",
    "cors-default":                                   "CWE-346",
    "cors-misconfiguration":                          "CWE-346",
    "cors-allow-all":                                 "CWE-346",
    "jwt-none-alg":                                   "CWE-345",
    "jwt-not-verified":                               "CWE-347",
    "jwt-weak":                                       "CWE-347",
    "jwt-unsigned":                                   "CWE-345",
    "insecure-cookie":                                "CWE-614",
    "cookie-without-httponly":                        "CWE-1004",
    "cookie-without-secure":                          "CWE-614",
    "cookie-samesite":                                "CWE-1275",
    "session-fixation":                               "CWE-384",
    "session-regenerate":                             "CWE-384",
    "weak-password":                                  "CWE-521",
    "password-complexity":                            "CWE-521",
    "no-rate-limiting":                               "CWE-307",
    "brute-force":                                    "CWE-307",
    "account-lockout":                                "CWE-307",
    "missing-authentication":                         "CWE-306",
    "authentication-bypass":                          "CWE-287",
    "broken-auth":                                    "CWE-287",

    # -- Open redirect --------------------------------------------------------
    "open-redirect":                                  "CWE-601",
    "tainted-url-redirect":                           "CWE-601",
    "unvalidated-redirect":                           "CWE-601",

    # -- Injection (other) ----------------------------------------------------
    "ldap-injection":                                 "CWE-90",
    "ldap-taint":                                     "CWE-90",
    "xpath-injection":                                "CWE-643",
    "xpath-taint":                                    "CWE-643",
    "log-injection":                                  "CWE-117",
    "log-forging":                                    "CWE-117",
    "sensitive-log":                                  "CWE-532",
    "cleartext-logging":                              "CWE-532",
    "header-injection":                               "CWE-113",
    "response-splitting":                             "CWE-113",
    "crlf-injection":                                 "CWE-93",
    "format-string":                                  "CWE-134",
    "format-injection":                               "CWE-134",

    # -- XXE / XML ------------------------------------------------------------
    "xxe":                                            "CWE-611",
    "xml-external":                                   "CWE-611",
    "xml-injection":                                  "CWE-91",
    "xml-bomb":                                       "CWE-776",
    "xpath":                                          "CWE-643",

    # -- Deserialization ------------------------------------------------------
    "deserializ":                                     "CWE-502",
    "pickle":                                         "CWE-502",
    "yaml.load":                                      "CWE-20",
    "object-injection":                               "CWE-502",
    "unserialize":                                    "CWE-502",
    "unsafe-deserialization":                         "CWE-502",

    # -- SSL / TLS / certificates ---------------------------------------------
    "ssl-verify-false":                               "CWE-295",
    "certificate-validation":                         "CWE-295",
    "no-ssl-verify":                                  "CWE-295",
    "tls-disabled":                                   "CWE-319",
    "weak-ssl":                                       "CWE-326",
    "weak-tls":                                       "CWE-326",
    "self-signed":                                    "CWE-295",
    "hostname-verification":                          "CWE-297",
    "host-mismatch":                                  "CWE-297",

    # -- Information disclosure -----------------------------------------------
    "debug-enabled":                                  "CWE-94",
    "debug-mode":                                     "CWE-489",
    "stack-trace":                                    "CWE-209",
    "error-message":                                  "CWE-209",
    "information-exposure":                           "CWE-200",
    "sensitive-data-exposure":                        "CWE-200",
    "directory-listing":                              "CWE-548",

    # -- File upload ----------------------------------------------------------
    "unrestricted-file-upload":                       "CWE-434",
    "file-extension":                                 "CWE-434",
    "file-type-check":                                "CWE-434",
    "file-inclusion":                                 "CWE-98",
    "lfi":                                            "CWE-98",
    "rfi":                                            "CWE-98",
    "local-file-include":                             "CWE-98",

    # -- Prototype pollution / JS-specific ------------------------------------
    "prototype-pollution":                            "CWE-1321",
    "mass-assignment":                                "CWE-915",
    "unsafe-reflection":                              "CWE-470",

    # -- ReDoS ----------------------------------------------------------------
    "regex-injection":                                "CWE-1333",
    "redos":                                          "CWE-1333",
    "unsafe-regex":                                   "CWE-1333",
    "exponential-regex":                              "CWE-1333",

    # -- Empty catch / error handling -----------------------------------------
    "empty-catch":                                    "CWE-390",
    "swallowed-exception":                            "CWE-390",
    "silent-error":                                   "CWE-390",

    # -- Race conditions / resources ------------------------------------------
    "race-condition":                                 "CWE-362",
    "toctou":                                         "CWE-367",
    "integer-overflow":                               "CWE-190",
    "resource-exhaustion":                            "CWE-400",
    "denial-of-service":                              "CWE-400",

    # -- Clickjacking / UI layers ---------------------------------------------
    "clickjack":                                      "CWE-1021",
    "clickjacking":                                   "CWE-1021",
    "missing-x-frame":                                "CWE-1021",
    "frame-options":                                  "CWE-1021",

    # -- CDN / supply chain ---------------------------------------------------
    "cdn-without-integrity":                          "CWE-829",
    "subresource-integrity":                          "CWE-829",
    "untrusted-cdn":                                  "CWE-829",

    # -- Timing / side-channel ------------------------------------------------
    "timing-attack":                                  "CWE-208",
    "timing-safe":                                    "CWE-208",
    "side-channel":                                   "CWE-208",

    # -- Spring / Java --------------------------------------------------------
    "spring-csrf-disabled":                           "CWE-352",
    "spring.security.audit.csrf":                     "CWE-352",
    "spring.security.audit.weak-ssl":                 "CWE-326",
    "spring.security.audit.object-deserialization":   "CWE-502",
    "spring.security.audit.permissive-cors":          "CWE-346",
    "spring.security.audit.insecure-endpoint":        "CWE-284",
    "java.lang.security.audit.formatted-sql-string":  "CWE-89",
    "java.lang.security.audit.command-injection":     "CWE-78",
    "java.lang.security.audit.xml-dtd":               "CWE-611",
    "java.lang.security.audit.xxe":                   "CWE-611",
    "java.lang.security.audit.ldap-injection":        "CWE-90",
    "java.lang.security.audit.xpath-injection":       "CWE-643",
    "java.lang.security.audit.crypto":                "CWE-327",
    "java.lang.security.audit.deserialization":       "CWE-502",
    "java.spring.security":                           "CWE-16",  # generic fallback

    # -- Generic / catch-all --------------------------------------------------
    "taint":                                          "CWE-20",
    "unvalidated-input":                              "CWE-20",
    "user-controlled":                                "CWE-20",
    "input-validation":                               "CWE-20",
    "insecure-default":                               "CWE-1188",
}


# =============================================================================
# SONARQUBE  -- rule key -> CWE
# Covers Python, JavaScript, TypeScript, Java, PHP, Ruby, C/C++
# =============================================================================

SONAR_TO_CWE = {

    # =========================================================================
    # PYTHON
    # =========================================================================

    # Injection
    "python:S2076": "CWE-78",    # OS command injection
    "python:S3649": "CWE-89",    # SQL injection
    "python:S5131": "CWE-79",    # XSS -- render_template_string
    "python:S5148": "CWE-79",    # XSS -- unescaped output
    "python:S5247": "CWE-79",    # XSS -- Jinja2
    "python:S4721": "CWE-78",    # eval / exec
    "python:S1523": "CWE-95",    # Dynamic code execution
    "python:S5146": "CWE-918",   # SSRF
    "python:S5144": "CWE-601",   # Open redirect
    "python:S5167": "CWE-352",   # CSRF
    "python:S6400": "CWE-90",    # LDAP injection
    "python:S2755": "CWE-611",   # XXE
    "python:S6096": "CWE-22",    # Path traversal

    # Cryptography / secrets
    "python:S2068": "CWE-798",   # Hard-coded credentials
    "python:S6437": "CWE-798",   # Hard-coded secret key
    "python:S1313": "CWE-798",   # Hard-coded IP address
    "python:S4790": "CWE-327",   # Weak hash (MD5/SHA1)
    "python:S2278": "CWE-327",   # DES / 3DES
    "python:S5542": "CWE-327",   # ECB cipher mode
    "python:S5547": "CWE-326",   # Weak key length
    "python:S4426": "CWE-326",   # RSA/DSA key < 2048 bits
    "python:S5659": "CWE-347",   # JWT not verified
    "python:S2245": "CWE-330",   # Pseudorandom number generator
    "python:S4423": "CWE-326",   # Weak TLS configuration
    "python:S3329": "CWE-329",   # Static / no IV for AES
    "python:S6779": "CWE-798",   # Hard-coded flask secret key

    # Authentication / session / cookies
    "python:S6329": "CWE-306",   # Auth without password
    "python:S5022": "CWE-346",   # Permissive CORS
    "python:S5443": "CWE-377",   # Temp file in shared directory
    "python:S5708": "CWE-295",   # Cert validation disabled
    "python:S2092": "CWE-614",   # Secure cookie flag missing
    "python:S3330": "CWE-1004",  # HttpOnly cookie flag missing
    "python:S4792": "CWE-532",   # Sensitive info in logs
    "python:S8392": "CWE-605",   # Multiple Binds to the Same Port
    "python:S2612": "CWE-732",   # Incorrect Permission Assignment for Critical Resource

    # Quality only
    "python:S3776": None,
    "python:S1192": None,
    "python:S1542": None,
    "python:S117":  None,
    "python:S1172": None,
    "python:S1481": None,
    "python:S1854": None,

    # =========================================================================
    # JAVASCRIPT
    # =========================================================================

    # Injection
    "javascript:S2076": "CWE-78",
    "javascript:S3649": "CWE-89",
    "javascript:S5148": "CWE-79",
    "javascript:S5247": "CWE-79",
    "javascript:S4721": "CWE-78",
    "javascript:S1523": "CWE-95",
    "javascript:S5146": "CWE-918",
    "javascript:S5144": "CWE-601",
    "javascript:S1121": "CWE-601",
    "javascript:S5167": "CWE-352",
    "javascript:S2755": "CWE-611",
    "javascript:S6096": "CWE-22",
    "javascript:S4817": "CWE-611",
    "javascript:S4818": "CWE-319",
    "javascript:S4823": "CWE-88",
    "javascript:S4829": "CWE-88",
    "javascript:S5852": "CWE-1333",

    # Cryptography / secrets
    "javascript:S2068": "CWE-798",
    "javascript:S6437": "CWE-798",
    "javascript:S1313": "CWE-798",
    "javascript:S4790": "CWE-327",
    "javascript:S2245": "CWE-330",
    "javascript:S5659": "CWE-347",
    "javascript:S4423": "CWE-326",

    # Authentication / session / cookies
    "javascript:S5022": "CWE-346",
    "javascript:S5876": "CWE-384",
    "javascript:S5443": "CWE-377",
    "javascript:S5708": "CWE-295",
    "javascript:S2092": "CWE-614",
    "javascript:S3330": "CWE-1004",
    "javascript:S5734": "CWE-829",
    "javascript:S6349": "CWE-312",
    "javascript:S3598": "CWE-275",
    "javascript:S2486": "CWE-390",
    "javascript:S5332": "CWE-319",
    "javascript:S4792": "CWE-532",

    # Quality only
    "javascript:S3776": None,
    "javascript:S1192": None,
    "javascript:S1854": None,
    "javascript:S1481": None,
    "javascript:S6582": None,
    "javascript:S3504": None,
    "javascript:S1116": None,

    # =========================================================================
    # TYPESCRIPT
    # =========================================================================

    "typescript:S2068": "CWE-798",
    "typescript:S6437": "CWE-798",
    "typescript:S1313": "CWE-798",
    "typescript:S2245": "CWE-330",
    "typescript:S4790": "CWE-327",
    "typescript:S5659": "CWE-347",
    "typescript:S5022": "CWE-346",
    "typescript:S5876": "CWE-384",
    "typescript:S3330": "CWE-1004",
    "typescript:S2092": "CWE-614",
    "typescript:S4423": "CWE-326",
    "typescript:S2076": "CWE-78",
    "typescript:S3649": "CWE-89",
    "typescript:S5148": "CWE-79",
    "typescript:S5167": "CWE-352",
    "typescript:S5146": "CWE-918",
    "typescript:S5144": "CWE-601",
    "typescript:S5852": "CWE-1333",
    "typescript:S5734": "CWE-829",
    "typescript:S5332": "CWE-319",
    "typescript:S6096": "CWE-22",
    "typescript:S4721": "CWE-78",
    "typescript:S1523": "CWE-95",
    "typescript:S1121": "CWE-601",
    "typescript:S2486": "CWE-390",
    "typescript:S4792": "CWE-532",
    "typescript:S2755": "CWE-611",

    # =========================================================================
    # JAVA
    # =========================================================================

    # Injection
    "java:S2076": "CWE-78",
    "java:S3649": "CWE-89",
    "java:S5131": "CWE-79",
    "java:S5148": "CWE-79",
    "java:S4721": "CWE-78",
    "java:S5146": "CWE-918",
    "java:S5144": "CWE-601",
    "java:S5167": "CWE-352",
    "java:S2755": "CWE-611",
    "java:S6096": "CWE-22",
    "java:S4823": "CWE-88",
    "java:S5145": "CWE-117",
    "java:S5135": "CWE-502",
    "java:S6400": "CWE-90",
    "java:S4792": "CWE-532",

    # Cryptography / secrets
    "java:S2068": "CWE-798",
    "java:S6437": "CWE-798",
    "java:S1313": "CWE-798",
    "java:S4790": "CWE-327",
    "java:S2278": "CWE-327",
    "java:S5542": "CWE-327",
    "java:S5547": "CWE-326",
    "java:S4426": "CWE-326",
    "java:S3329": "CWE-330",
    "java:S2245": "CWE-330",
    "java:S5344": "CWE-326",
    "java:S5659": "CWE-347",
    "java:S4423": "CWE-326",

    # Authentication / session
    "java:S5708": "CWE-295",
    "java:S5527": "CWE-295",
    "java:S5022": "CWE-346",
    "java:S5876": "CWE-384",
    "java:S3330": "CWE-1004",
    "java:S2092": "CWE-614",
    "java:S6287": "CWE-306",
    "java:S4834": "CWE-284",

    # Quality only
    "java:S3776": None,
    "java:S1192": None,
    "java:S1172": None,
    "java:S1481": None,
    "java:S1854": None,

    # =========================================================================
    # PHP
    # =========================================================================

    "php:S2076": "CWE-78",
    "php:S3649": "CWE-89",
    "php:S5148": "CWE-79",
    "php:S5247": "CWE-79",
    "php:S2068": "CWE-798",
    "php:S6437": "CWE-798",
    "php:S5146": "CWE-918",
    "php:S5144": "CWE-601",
    "php:S2755": "CWE-611",
    "php:S6096": "CWE-22",
    "php:S4790": "CWE-327",
    "php:S2245": "CWE-330",
    "php:S5659": "CWE-347",
    "php:S5022": "CWE-346",
    "php:S3330": "CWE-1004",
    "php:S2092": "CWE-614",
    "php:S5167": "CWE-352",
    "php:S4423": "CWE-326",
    "php:S5708": "CWE-295",

    # =========================================================================
    # RUBY
    # =========================================================================

    "ruby:S2076": "CWE-78",
    "ruby:S3649": "CWE-89",
    "ruby:S5148": "CWE-79",
    "ruby:S2068": "CWE-798",
    "ruby:S5146": "CWE-918",
    "ruby:S5144": "CWE-601",
    "ruby:S2245": "CWE-330",
    "ruby:S4790": "CWE-327",
    "ruby:S5659": "CWE-347",
    "ruby:S5022": "CWE-346",
    "ruby:S3330": "CWE-1004",
    "ruby:S2092": "CWE-614",
    "ruby:S5167": "CWE-352",
    "ruby:S2755": "CWE-611",

    # =========================================================================
    # C / C++
    # =========================================================================

    "c:S5816":   "CWE-134",  # Format string injection
    "c:S5801":   "CWE-119",  # Buffer overflow
    "c:S5782":   "CWE-416",  # Use after free
    "c:S5813":   "CWE-190",  # Integer overflow
    "c:S5789":   "CWE-476",  # NULL pointer dereference
    "c:S5814":   "CWE-362",  # Race condition (TOCTOU)
    "cpp:S5816": "CWE-134",
    "cpp:S5801": "CWE-119",
    "cpp:S5782": "CWE-416",
    "cpp:S5813": "CWE-190",
    "cpp:S5789": "CWE-476",
    "cpp:S5814": "CWE-362",
}


# =============================================================================
# CONDITION DETECTOR
# =============================================================================

def detect_condition_from_stem(stem: str) -> str:
    s = stem.lower()
    if "b_secure" in s or s=="cond_b" or s == "secure" or s.endswith("_secure"):
        return "B_secure"
    return "A_standard"


# =============================================================================
# PARSERS
# =============================================================================

def _cwe_from_semgrep_result(result: dict) -> str | None:
    """Extract CWE from Semgrep metadata, falling back to rule-ID fragment match."""
    meta = result.get("extra", {}).get("metadata", {})

    # 1. Direct CWE field in metadata
    for key in ("cwe", "cwe-id", "cwe_id", "owasp"):
        val = meta.get(key)
        if val:
            raw = val[0] if isinstance(val, list) else str(val)
            m = re.search(r"CWE-?(\d+)", str(raw), re.IGNORECASE)
            if m:
                return f"CWE-{m.group(1)}"

    # 2. Fragment match on rule ID (longest / most-specific wins)
    rule_id = result.get("check_id", "").lower()
    for fragment in sorted(SEMGREP_RULE_TO_CWE, key=len, reverse=True):
        if fragment.lower() in rule_id:
            return SEMGREP_RULE_TO_CWE[fragment]

    return None


def extract_bandit(json_path, llm, lang, task_name, condition):
    rows = []
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception:
        return rows

    for issue in data.get("results", []):
        test_id = issue.get("test_id", "")
        # Newer Bandit versions include CWE directly
        cwe_raw = issue.get("issue_cwe", {})
        cwe_id = None
        if isinstance(cwe_raw, dict) and cwe_raw.get("id"):
            cwe_id = f"CWE-{cwe_raw['id']}"
        if not cwe_id:
            cwe_id = BANDIT_TO_CWE.get(test_id)

        sev    = SEVERITY_MAP.get(issue.get("issue_severity", "LOW").upper(), "LOW")
        is_sec = cwe_id not in QUALITY_ONLY_CWES and cwe_id is not None

        rows.append({
            "llm":             llm,
            "language":        lang,
            "task_name":       task_name,
            "condition":       condition,
            "tool":            "Bandit",
            "rule_id":         test_id,
            "cwe_id":          cwe_id or "UNKNOWN",
            "cwe_description": CWE_DESCRIPTIONS.get(cwe_id, ""),
            "severity":        sev,
            "is_security":     is_sec,
            "is_quality_only": not is_sec,
            "line_number":     issue.get("line_number", ""),
            "description":     issue.get("issue_text", "")[:150],
        })
    return rows


def extract_semgrep(json_path, llm, lang, task_name, condition):
    rows = []
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception:
        return rows

    for result in data.get("results", []):
        cwe_id     = _cwe_from_semgrep_result(result)
        rule_id    = result.get("check_id", "")
        short_rule = rule_id.split(".")[-1][:80] if "." in rule_id else rule_id[:80]
        sev_raw    = result.get("extra", {}).get("severity", "INFO")
        sev        = SEVERITY_MAP.get(sev_raw.upper(), "LOW")
        is_sec     = cwe_id not in QUALITY_ONLY_CWES and cwe_id is not None

        rows.append({
            "llm":             llm,
            "language":        lang,
            "task_name":       task_name,
            "condition":       condition,
            "tool":            "Semgrep",
            "rule_id":         short_rule,
            "cwe_id":          cwe_id or "UNKNOWN",
            "cwe_description": CWE_DESCRIPTIONS.get(cwe_id, ""),
            "severity":        sev,
            "is_security":     is_sec,
            "is_quality_only": not is_sec,
            "line_number":     result.get("start", {}).get("line", ""),
            "description":     result.get("extra", {}).get("message", "")[:150],
        })
    return rows


def extract_sonarqube(json_path, llm, lang, task_name, condition):
    rows = []
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception:
        return rows

    for issue in data.get("issues", []):
        rule_id = issue.get("rule", "")
        tags    = issue.get("tags", [])
        impacts = issue.get("impacts", [])

        # 1. Look up our table
        cwe_id = SONAR_TO_CWE.get(rule_id)

        # 2. Fall back to CWE tag on the issue (e.g. "cwe89", "cwe-89")
        if cwe_id is None:
            for tag in tags:
                m = re.search(r"cwe[- _]?(\d+)", tag, re.IGNORECASE)
                if m:
                    cwe_id = f"CWE-{m.group(1)}"
                    break

        # 3. Classify security vs. quality
        has_security_impact = any(
            i.get("softwareQuality") == "SECURITY" for i in impacts
        )
        has_cwe_tag = any("cwe" in t.lower() for t in tags)
        is_quality  = cwe_id is None and not has_security_impact and not has_cwe_tag
        is_sec      = not is_quality and cwe_id not in QUALITY_ONLY_CWES
        sev         = SEVERITY_MAP.get(issue.get("severity", "MINOR").upper(), "LOW")

        rows.append({
            "llm":             llm,
            "language":        lang,
            "task_name":       task_name,
            "condition":       condition,
            "tool":            "SonarQube",
            "rule_id":         rule_id,
            "cwe_id":          cwe_id or ("QUALITY_ONLY" if is_quality else "UNKNOWN"),
            "cwe_description": CWE_DESCRIPTIONS.get(cwe_id, ""),
            "severity":        sev,
            "is_security":     is_sec,
            "is_quality_only": is_quality,
            "line_number":     issue.get("line", ""),
            "description":     issue.get("message", "")[:150],
        })
    return rows


# =============================================================================
# MAIN
# =============================================================================

FIELDS = [
    "llm", "language", "task_name", "condition", "tool",
    "rule_id", "cwe_id", "cwe_description", "severity",
    "is_security", "is_quality_only", "line_number", "description",
]


def parse_all():
    if not RAW_DIR.exists():
        print(f"ERROR: {RAW_DIR} does not exist.")
        print("Run scan_all.py first.")
        return []

    all_rows = []

    for json_file in sorted(RAW_DIR.rglob("*.json")):
        rel   = json_file.relative_to(RAW_DIR)
        parts = rel.parts

        if len(parts) < 4:
            print(f"  Skipping unexpected path: {json_file}")
            continue

        llm       = parts[0]
        lang      = parts[1]
        task_name = parts[2]
        filename  = json_file.stem

        if filename.endswith("_bandit"):
            tool      = "bandit"
            file_stem = filename[:-7]
        elif filename.endswith("_semgrep"):
            tool      = "semgrep"
            file_stem = filename[:-8]
        elif filename.endswith("_sonarqube"):
            tool      = "sonarqube"
            file_stem = filename[:-10]
        else:
            continue

        condition = detect_condition_from_stem(file_stem)

        if tool == "bandit":
            rows = extract_bandit(json_file, llm, lang, task_name, condition)
        elif tool == "semgrep":
            rows = extract_semgrep(json_file, llm, lang, task_name, condition)
        elif tool == "sonarqube":
            rows = extract_sonarqube(json_file, llm, lang, task_name, condition)
        else:
            rows = []

        all_rows.extend(rows)

    if not all_rows:
        print("No findings parsed. Check that results/raw/ contains JSON files.")
        return []

    out = CSV_DIR / "all_findings.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(all_rows)

    sec_count  = sum(1 for r in all_rows if r["is_security"])
    qual_count = sum(1 for r in all_rows if r["is_quality_only"])
    unk_count  = sum(1 for r in all_rows if r["cwe_id"] == "UNKNOWN")
    print(f"Raw dir  : {RAW_DIR}")
    print(f"CSV out  : {out}")
    print(f"Parsed {len(all_rows)} total rows")
    print(f"  Security findings : {sec_count}")
    print(f"  Quality-only      : {qual_count}")
    if unk_count:
        print(f"  Unknown CWE       : {unk_count}  <- extend SONAR_TO_CWE or SEMGREP_RULE_TO_CWE for these")
    return all_rows


if __name__ == "__main__":
    parse_all()