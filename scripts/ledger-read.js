// 固定工作表只读；新增进场合计行后仍输出看板约定的 16 行结构。
var sheet = Application.ActiveWorkbook.Worksheets.Item("水稳原材统计");
var rows = sheet.Range("A1:J20").Value2;
var expected = {2:"理论施工量",3:"自检进场总量",4:"自检进场总批次",5:"外委进场总量",6:"外委进场总批次",9:"差值",10:"理论施工量",11:"自检进场总量",12:"自检进场总批次",13:"外委进场总量",14:"外委进场总批次",17:"差值"};
for (var r in expected) if (String(rows[r][1]).trim() !== expected[r]) throw Error("统计表结构已变化，请检查第"+(Number(r)+1)+"行");
if (String(rows[18][0]).trim() !== "理论总消耗" || String(rows[19][0]).trim() !== "进场总量") throw Error("统计合计行已变化");
var map = [0,1,2,3,4,5,6,9,10,11,12,13,14,17,18,19];
return {success:true,schemaVersion:1,readAt:new Date().toISOString(),rows:map.map(function(i){return rows[i];})};
