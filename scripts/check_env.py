import re, sys
path = sys.argv[1] if len(sys.argv) > 1 else '.env.production.tmp'
for line in open(path):
    if line.startswith(('SUPABASE','VITE_SUPABASE')):
        k,v = line.rstrip().split('=',1)
        v = v.strip('"')
        if 'KEY' in k or 'PIN' in k:
            print(f'{k} len={len(v)}')
        else:
            masked = re.sub(r'(://[^:]+:)[^@]+@', r'\1***@', v)
            print(f'{k}={masked!r}')
