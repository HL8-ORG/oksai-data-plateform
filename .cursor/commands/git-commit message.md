# commit message

**仅根据暂存区的代码生成 commit message，并且提交信息使用英文**

```bash
git commit -m "Changed $(git diff --cached --shortstat) | Files: $(git diff --cached --name-only | tr '\n' ',' | sed 's/,$//')"
```
