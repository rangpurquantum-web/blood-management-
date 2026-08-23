import re

FILES = [
    "features/donors/components/donor-table.tsx",
    "features/donors/components/birthday-list.tsx",
    "features/donors/components/donor-profile.tsx",
]

# Matches: <Button asChild variant="ghost" size="icon" className="..." title="...">
#            <a ...>
#              <SomeIcon .../>
#            </a>
#          </Button>
PATTERN = re.compile(
    r'<Button\s+asChild\s+variant="ghost"\s+size="icon"\s+className="([^"]*)"\s+title="([^"]*)"\s*>'
    r'\s*<a\s+([^>]*)>'
    r'\s*(<\w+[^/]*/>)'
    r'\s*</a>\s*</Button>',
    re.DOTALL,
)


def replacement(match):
    class_name, title, a_attrs, icon = match.groups()
    a_attrs = a_attrs.strip()
    return (
        f'<a\n'
        f'                {a_attrs}\n'
        f'                className={{cn(buttonVariants({{ variant: "ghost", size: "icon" }}), "{class_name}")}}\n'
        f'                title="{title}"\n'
        f'              >\n'
        f'                {icon}\n'
        f'              </a>'
    )


def ensure_imports(content: str) -> str:
    # Ensure buttonVariants is imported alongside Button
    content = re.sub(
        r'import \{ Button \} from "@/components/ui/button";',
        'import { Button, buttonVariants } from "@/components/ui/button";',
        content,
    )
    # Ensure cn is imported from lib/utils
    if 'from "@/lib/utils"' not in content:
        # insert after the last import line
        lines = content.split("\n")
        last_import_idx = max(i for i, l in enumerate(lines) if l.strip().startswith("import "))
        lines.insert(last_import_idx + 1, 'import { cn } from "@/lib/utils";')
        content = "\n".join(lines)
    return content


total_fixed = 0
for path in FILES:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    new_content, count = PATTERN.subn(replacement, content)
    new_content = ensure_imports(new_content)

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"{path}: fixed {count} occurrence(s)")
    total_fixed += count

print(f"\nTotal fixed: {total_fixed}")
