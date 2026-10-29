// Offline DOM/Chart contract harness, NOT a browser or CSS layout engine.
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
function page(html,data,{width=1280,loadModules=true}={}) {
  const nodes=new Map(),charts=[],initialize=[];
  function element(id='') {
    const classes=new Set(),listeners=new Map();let children=[],markup='';
    return {id,value:'',checked:false,disabled:false,style:{},parentElement:{style:{}},
      classList:{add(n){classes.add(n);},remove(n){classes.delete(n);},contains(n){return classes.has(n);},
        toggle(n,force){const use=force===undefined?!classes.has(n):force;if(use)classes.add(n);else classes.delete(n);return use;}},
      get children(){return children;},get options(){return children;},
      set innerHTML(v){markup=v;children=[];},get innerHTML(){return markup;},
      appendChild(o){children.push(o);if(!this.value&&o.value)this.value=o.value;},
      cloneNode(){const n=element();n.value=this.value;n.textContent=this.textContent;return n;},
      scrollIntoView(){},addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
      fire(type){for(const fn of listeners.get(type)||[])fn({target:this});},
      getBoundingClientRect(){return {top:0,height:100,width};}};
  }
  function node(id){if(!nodes.has(id)){const n=element(id);n.checked=new RegExp('<input[^>]*id="'+id+'"[^>]*\\bchecked').test(html);nodes.set(id,n);}return nodes.get(id);}
  const document={getElementById:node,createElement:()=>element(),querySelectorAll(){return [];},querySelector(){return null;},
    addEventListener(type,fn){if(type==='DOMContentLoaded')initialize.push(fn);}};
  node('exp-lag').value='0';
  class Chart {constructor(canvas,config){this.canvas=canvas;this.config=config;this.data=config.data;this.options=config.options;this.destroyed=false;charts.push(this);}destroy(){this.destroyed=true;}update(){}}
  Chart.defaults={font:{}};
  const context=vm.createContext({CC_ECONOMIC_DATA:data,document,Chart,console,Date,Math,
    window:{innerWidth:width,print(){},addEventListener(){},scrollTo(){}},innerWidth:width,
    alert(){},IntersectionObserver:class{observe(){}}});
  const scripts=[...html.matchAll(/<script(?:\s+src="([^"]+)")?[^>]*>([\s\S]*?)<\/script>/g)];
  for(const match of scripts){
    if(!match[1])vm.runInContext(match[2],context);
    else if(loadModules&&/^scripts\/macro-(analysis|view)\.js$/.test(match[1]))vm.runInContext(fs.readFileSync(path.join(ROOT,match[1]),'utf8'),context);
  }
  initialize.forEach(fn=>fn());
  return {ctx:context,nodes,charts,run:code=>vm.runInContext(code,context)};
}
module.exports={page};
