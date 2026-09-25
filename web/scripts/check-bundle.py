"""Measure a complete Git bundle without mutating the managed checkout's .git.
The disposable clone and bundle are test scaffolding, never submitted artifacts.
"""
from pathlib import Path
import subprocess,json,shutil,os
root=Path(__file__).resolve().parents[2]
scratch=root/'test/scratch/frontend-bundle';scratch.mkdir(parents=True,exist_ok=True)
repo=scratch/'repo.git'
if repo.exists():shutil.rmtree(repo)
subprocess.run(['git','clone','--bare','--no-hardlinks',str(root),str(repo)],check=True,capture_output=True)
git=['git','--git-dir='+str(repo),'--work-tree='+str(root)]
subprocess.run(git+['read-tree','HEAD'],check=True)
subprocess.run(git+['add','--','web','dist','docs'],check=True)
paths=subprocess.check_output(git+['diff','--cached','--name-only'],text=True).splitlines()
assert all(p.startswith(('web/','dist/','docs/')) for p in paths)
assert all(not any(part in ('node_modules','.cache','.npm','.vite','vendor') for part in p.split('/')) for p in paths)
subprocess.run(git+['diff','--cached','--check','--','web/src','web/scripts','web/tests','web/README.md','docs/FRONTEND_VALIDATION.md'],check=True)
subprocess.run(git+['-c','user.name=Frontend validation','-c','user.email=validation@example.invalid','commit','-m','Validate release bundle size in disposable scaffolding'],check=True,capture_output=True)
assert not any(line.startswith('160000') for line in subprocess.check_output(git+['ls-tree','-r','HEAD'],text=True).splitlines())
bundle=scratch/'submission.bundle'
packed=subprocess.run(git+['bundle','create',str(bundle),'HEAD'],capture_output=True)
if packed.returncode:
    # Managed checkouts may omit historical blobs. Hydrate only the scratch clone.
    handoff=json.loads((root/'web/deployment/handoff.json').read_text())
    subprocess.run(git+['fetch','--refetch',handoff['repoUrl'],handoff['sourceCommit']],check=True,capture_output=True,env={**os.environ,'GIT_TERMINAL_PROMPT':'0'})
    subprocess.run(git+['bundle','create',str(bundle),'HEAD'],check=True,capture_output=True)
subprocess.run(git+['bundle','verify',str(bundle)],check=True,capture_output=True)
size=bundle.stat().st_size
assert size<=8388608,(size,'bundle budget exceeded')
print(json.dumps({'completeHistoryBundleBytes':size,'limitBytes':8388608,'changedPathCount':len(paths),'scopeOnly':True,'trackedDependencyCaches':False,'gitSubmodules':False,'note':'Disposable validation commit only; managed checkout .git remains read-only.'},indent=2))
