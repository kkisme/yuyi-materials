"""Only publish fixed numeric material statistics; credentials stay in Actions secrets."""
import json,os,pathlib,urllib.request,math
def validate(result):
    assert result.get('success') is True
    rows=result['rows']; assert len(rows)==16
    for row in rows[2:]:
        assert len(row)==10
        assert all(isinstance(v,(int,float)) and math.isfinite(v) for v in row[2:])
    for c in range(2,10):
        assert abs(rows[15][c]-sum(rows[r][c] for r in (3,5,9,11)))<0.05
        assert abs(rows[14][c]-rows[2][c]-rows[8][c])<0.05
    return {'success':True,'schemaVersion':1,'readAt':result['readAt'],'rows':[[] if i<2 else [None,None]+r[2:10] for i,r in enumerate(rows)]}
def main():
    req=urllib.request.Request(os.environ['WPS_WEBHOOK'],data=json.dumps({'Context':{'argv':{}}}).encode(),headers={'Content-Type':'application/json','AirScript-Token':os.environ['WPS_TOKEN']})
    with urllib.request.urlopen(req,timeout=50) as r: raw=json.load(r)
    result=raw['data']['result']
    if isinstance(result,str):result=json.loads(result)
    output=validate(result)
    pathlib.Path('data.json').write_text(json.dumps(output,separators=(',',':')),encoding='utf-8')
    print('Validated statistics read at '+output['readAt'])
if __name__=='__main__':main()
