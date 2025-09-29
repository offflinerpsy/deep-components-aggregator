const q = process.argv[2] || '1N4148';
fetch(`http://127.0.0.1:9201/api/search?q=${encodeURIComponent(q)}`)
  .then(r=>r.json()).then(j=>{ console.log(JSON.stringify({total:j?.meta?.total, sample:(j.rows||[]).slice(0,5)},null,2)); })
  .catch(()=>console.log(JSON.stringify({total:0,sample:[]},null,2)));
