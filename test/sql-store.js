import { Store } from '../server/store.js';
import { HttpError } from '../server/security.js';
// Test adapter executes the real migration/functions in embedded PostgreSQL.
// Production uses PostgREST; this is not a Supabase-network integration test.
export class SQLStore extends Store {
  constructor(db) { super({}); this.db=db; }
  where(filters, values) {
    return Object.entries(filters).filter(([k])=>!['order','select'].includes(k)).map(([k,v])=>{
      const dot=v.indexOf('.'), op=v.slice(0,dot), value=v.slice(dot+1);
      if(!['eq','gt'].includes(op))throw Error('Unsupported test filter');
      values.push(value);return `"${k}" ${op==='eq'?'=':'>'} $${values.length}`;
    }).join(' and ')||'true';
  }
  async rows(table,filters={}) {
    const values=[],where=this.where(filters,values);
    let sql=`select * from "${table}" where ${where}`;
    if(filters.order){const [column,direction]=filters.order.split('.');sql+=` order by "${column}" ${direction==='desc'?'desc':'asc'}`;}
    return (await this.db.query(sql,values)).rows;
  }
  async insert(table,value){
    const keys=Object.keys(value),values=Object.values(value).map(v=>typeof v==='object'&&v!==null?JSON.stringify(v):v);
    return (await this.db.query(`insert into "${table}" (${keys.map(k=>`"${k}"`).join(',')}) values (${keys.map((_,i)=>`$${i+1}`).join(',')}) returning *`,values)).rows[0];
  }
  async patch(table,filters,value){
    const keys=Object.keys(value),values=Object.values(value),where=this.where(filters,values);
    return (await this.db.query(`update "${table}" set ${keys.map((k,i)=>`"${k}"=$${i+1}`).join(',')} where ${where} returning *`,values)).rows;
  }
  async delete(table,filters){const values=[],where=this.where(filters,values);return (await this.db.query(`delete from "${table}" where ${where} returning *`,values)).rows;}
  async rpc(name,body){
    const values=Object.values(body).map(v=>typeof v==='object'&&v!==null?JSON.stringify(v):v);
    const result=await this.db.query(`select to_jsonb(public."${name}"(${Object.keys(body).map((k,i)=>`${k} => $${i+1}`).join(',')})) as result`,values);
    return result.rows[0].result;
  }
}
