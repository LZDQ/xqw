{
	find ./base-game -type f -name "*.js" -exec sh -c "echo \"File: {}\"; echo '\`\`\`javascript'; cat '{}'; echo '\`\`\`'" \; ;
	find ./base-game -type f -name "*.html" -exec sh -c "echo \"File: {}\"; echo '\`\`\`html'; cat '{}'; echo '\`\`\`'" \;
} | xclip -selection clipboard
