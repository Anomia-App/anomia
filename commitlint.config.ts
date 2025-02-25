/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { LintOutcome, RuleOutcome, UserConfig } from "@commitlint/types";
import lint from "@commitlint/lint";
import load from "@commitlint/load";

const ticketIdRegex = /(#[a-z0-9]{9} )/; // matches ClickUp ticket numbers
const revertRegex = /(This commit reverts [a-zA-Z0-9]+.)/;

const Configuration: UserConfig = {
    extends: ["@commitlint/config-conventional"],
    plugins: [{
        rules: {
            "clickup-ticket": (parsed): RuleOutcome => [clickUpTicket(parsed), "ClickUp ticket is either missing from commit message or in the wrong position in the commit message.\n    HINT: ensure ticket is prefixed with \"#\""],
            "clickup-subject": (parsed): RuleOutcome => [clickUpSubject(parsed), "commit message missing subject after the ClickUp ticket"],
            "lowercase-after-ticket": (parsed): RuleOutcome => [lowercaseAfterTicket(parsed), "subject following ClickUp ticket must begin with a lowercase letter"],
            "no-excess-whitespace": (parsed): RuleOutcome => [noExcessWhitespace(parsed), "subject has excessive whitespace either before ClickUp ticket or subject"],
            "valid-revert": async (parsed): Promise<RuleOutcome> => Promise.resolve(await validRevert(parsed))
        }
    },
    "selective-scope"
    ],
    rules: {
        "subject-case": [0, "always", "start-case"],
        "type-enum": [2, "always", ["feat", "fix", "perf", "docs", "style", "refactor", "test", "chore", "revert"]],
        "selective-scope": [2, "always", {
            feat: [/[\s\S]*/g],
            perf: [/[\s\S]*/g],
            fix: [/[\s\S]*/g],
            docs: [/[\s\S]*/g],
            style: [/[\s\S]*/g],
            refactor: [/[\s\S]*/g],
            test: [/[\s\S]*/g]
            // omitting chore type implies scope is optional
        }],
        "clickup-ticket": [2, "always"],
        "clickup-subject": [2, "always"],
        "lowercase-after-ticket": [2, "always"],
        "no-excess-whitespace": [2, "always"],
        "valid-revert": [2, "always"]
    }
};

// check if ClickUp ticket is properly included in commit subject
function clickUpTicket(parsed): boolean {
    const type = parsed.type;
    const subject = parsed.subject;

    if (type && (type === "chore" || type === "revert")) {
        // a commit of type "chore" does not require a Jira ticket
        return true;
    }

    return !!subject?.match(ticketIdRegex);
}

// check if subject following ticket ID exists
function clickUpSubject(parsed): boolean {
    if (parsed.type === "revert") {
        return true;
    }
    
    const split = parsed.subject?.split(ticketIdRegex)
        .filter(Boolean);

    const ticketAndSubject = !!split && !!split[0].match(ticketIdRegex) && !!split[1];
    const justSubject = !!split && !!split[0] && !split[1];
        
    return ticketAndSubject || justSubject;
}

// ensure subject following jira ticket (if any) begins with lowercase
function lowercaseAfterTicket(parsed): boolean {
    if (parsed.type === "revert") {
        return true;
    }
    
    const subject = parsed.subject;
    const split = subject?.split(ticketIdRegex)
        .map((el) => el.trim())
        .filter(Boolean);
    
    const validASCII = (str: string): boolean => {
        const lowercase = str.charCodeAt(0) >= 97 && str.charCodeAt(0) <= 122;
        const number = str.charCodeAt(0) >= 48 && str.charCodeAt(0) <= 57;
        
        return lowercase || number;
    };
    const lowercaseAfterJira = !!split && !!split[1] && validASCII(split[1]);
    const lowercaseSubject = !!split && validASCII(split[0]);

    return lowercaseAfterJira || lowercaseSubject;
}

// ensure there is no excess whitespace before the Jira ticket or subject
function noExcessWhitespace(parsed): boolean {
    if (parsed.type === "revert") {
        return true;
    }

    const split = parsed.subject?.split(ticketIdRegex)
        .filter(Boolean);
    
    const noPreJiraSpace = !!split && !!split[0] && split[0].charAt(0) !== " ";
    const noPreSubjectSpace = !!split && !split[2] && (
        !!split[1] && split[1].charAt(0) !== " " ||
        !split[1] && !!split[0] && split[0].charAt(0) !== " "
    );

    return noPreJiraSpace && noPreSubjectSpace;
}

// ensure conformity to revert commit convention
async function validRevert(parsed): Promise<[boolean, string]> {
    const type = parsed.type;
    const revertHeader = parsed.subject;
    
    let result: LintOutcome | undefined;
    if (revertHeader && type === "revert") {
        const config = await load(Configuration);
        result = await lint(revertHeader, config.rules, { plugins: config.plugins });
    }

    const validBody = parsed.body ? parsed.body.match(revertRegex) : true;
    
    let errorMsg = "revert commit is malformed";
    if (result?.errors) {
        errorMsg += "\n\nThe supplied header had the following issues:\n";
        result.errors.forEach((error) => {
            errorMsg += `\u001b[31m✖   \u001b[0m${error.message} \u001b[0;90m[${error.name}]\n`;
        });
        errorMsg += "\n";
    }

    return [result ? result.valid && !!validBody : true, errorMsg];
}
export default Configuration;
