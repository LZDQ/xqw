{
	find ./src -type f -name "*.ts" -exec sh -c "echo \"File: {}\"; echo '\`\`\`typescript'; cat '{}'; echo '\`\`\`'" \; ;
	find ./src -type f -name "*.tsx" -exec sh -c "echo \"File: {}\"; echo '\`\`\`typescript'; cat '{}'; echo '\`\`\`'" \;
} | xclip -selection clipboard
