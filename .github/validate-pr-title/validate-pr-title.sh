#!/bin/bash

COMMIT_REVERT="(revert: )"
COMMIT_TYPE="(feat|fix|perf|docs|style|refactor|test|chore)"
COMMIT_TYPE_CHORE="(chore)"
COMMIT_SCOPE="(\()([a-zA-Z0-9 ]*)(\): )"
COMMIT_TICKET="(#[a-z0-9]{9} )"
COMMIT_SUBJECT="([a-z ][\.a-zA-Z0-9 \-]*)"
COMMIT_REGEX="^(${COMMIT_REVERT}*)((${COMMIT_TYPE}${COMMIT_SCOPE}${COMMIT_TICKET})|(${COMMIT_TYPE_CHORE}${COMMIT_SCOPE}))${COMMIT_SUBJECT}$"

echo "$1" >> PR_TITLE

if ! grep -qE "$COMMIT_REGEX" PR_TITLE; then
    echo 'Aborting commit. Please ensure that your commit message matches the following structure:' >&2
    echo >&2
    echo '<feat|bug|chore|...>(<scope>): RD-<ticket number> commit message' >&2
    echo >&2
    echo 'see contributing guidelines for further details.' >&2
    rm PR_TITLE
    exit 1
fi

rm PR_TITLE

exit 0

