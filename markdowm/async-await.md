## 1.明确概念
async函数就是generator函数的语法糖。
async函数，就是将generator函数的*换成async，将yield替换成await。
## 2.async函数对generator的改进
(1) async内置执行器，不需要使用next()手动执行。
(2) await关键字后面的表达式返回的值可以是任何类型，只不过在解释器处理时，不是Promise类型的要转化成Promise.resolve(value)
yield关键字后面的表达式返回的值可以是任何类型。
(3) async函数返回值是Promise。返回非Promise时，async函数会把它包装成Promise返回。(Promise.resolve(value))
## 3.作用
异步编程的终极解决方案。

##### 如果想彻底搞懂以上概念，需要使用function* /yield手动去实现async/await，但是实现之前，需要知道async/await和function* /yield怎么使用。
##### 一、使用async/await
**这个函数贯穿始终**

```javascript
//模拟异步请求
const getTime = function (time, bool){
  return new Promise(function (resolve, reject){
    setTimeout(()=> {
      bool ? resolve(time) : reject(`${time}报错了`)
    }, time)
  });
};
```

1.async函数声明语句
```javascript
async function getData(){
  return await getTime(2000, true)
}
getData()
.then(res => {
  console.log(res) //2000
})
```

2.async函数表达式语句
```javascript
const getData = async function (){
  return await getTime(2000, true)
}
getData()
.then(res => {
  console.log(res) //2000
})
```

3.IIFE使用async
```javascript
( async () => {
  const data = await getTime(2000, true)
  console.log(data) //2000
})();
```

4.在对象上使用async
```javascript
const obj1 = {
  async getData(){
    return await getTime(2000, true)
  }
};
class obj2 {
  async getData(){
    return await getTime(1000, true)
  }
}
( async () => {
  const data1 = await obj1.getData();
  const data2 = await new obj2().getData();
  console.log(data1) //2000
  console.log(data2) //1000
})();
```

5.async函数内，手动捕获错误&处理
```javascript
async function getData(){
  return await getTime(2000, false)
}
( async () => {
  try{
    const data= await getData();
    console.log(data)
  } catch (err) {
    console.log(err) //2000报错了
  }
})();
```

6.async内使用同步
```javascript
async function getData(time){
  await getTime(2000, true) //延迟2秒
  return await getTime(time, true)
}

( async () => {
  console.time('title')
  const data1 = await getData(1000);
  const data2 = await getData(2000);
  console.log(data1) //1000
  console.log(data2) //2000
  console.timeEnd('title')
  // title: 7015.192ms
})();
```
>结论：两个await同步执行，整个函数运行完成7秒多

7.async内使用异步
```javascript
async function getData(time){
  await getTime(2000, true) //延迟2秒
  return await getTime(time, true)
}
( async () => {
  console.time('title')
  const data1 = getData(1000);
  const data2 = getData(2000);
  //请求全部发出后，await需要等待pramise状态，
  //如果pramise是pending状态需要继续等待，
  //如果不是pending,
  //为resolve时，其参数作为 await 表达式的值
  //为rejected时，await 表达式会将其参数当做异常抛出。
  const _data1 = await data1;
  const _data2 = await data2;
  console.log(_data1) //1000
  console.log(_data2) //2000
  console.timeEnd('title')
  //title: 4015.644ms
})();
```
>结论：两个await异步执行，整个函数运行完成4秒多。

**使用Promise.all实现异步**
```javascript
async function getData(time){
  await getTime(2000, true) //延迟2秒
  return await getTime(time, true)
}
( async () => {
  console.time('title')
  const [data1, data2] = await Promise.all([
    getData(1000),
    getData(2000)
  ])
  console.log(data1) //1000
  console.log(data2) //2000
  console.timeEnd('title')
  //title: 4018.707ms
})();
```
**在for循环中实现异步**
```javascript
async function getData(time){
  await getTime(2000, true) //延迟2秒
  return await getTime(time, true)
}
( async () => {
  console.time('title')
  let promise = [1000, 2000]
  promise = promise.map(item =>getData(item))
  for(const i of promise){
    let data = await i
    console.log(data)
    //1000
    //2000
  }
  console.timeEnd('title')
  //title: 4005.523ms
})();
```

##### 二、使用function* / yield
[关于function* / yield的基础方法介绍的文章](https://www.cnblogs.com/liumingwang/p/10216073.html)
[文章部分介绍了function* / yield](https://www.jianshu.com/p/464c5aeabc40)
基础方法需要了解一下，不赘述了


#### 三、使用function* / yield 实现 async/await 函数
>实现目标：
①内部支持异步代码的同步化
②函数返回值必须是一个Promise
③yield后的值必须是Promise，不是的会被转化成Promise
④函数体内如果使用try/catch语句，能够捕获错误，且不影响函数内以下代码的执行。
⑤函数体内没有使用try/catch包裹的语句如果报错，需要在函数返回的Promise对象的catch捕获，且函数内代码执行结束。
⑥函数的参数要正常使用，且执行内部的this需要指向定义时的对象。
⑦如果执行函数内部return 后是Promise，直接取这个Promise的状态和值为己用，如果结果值依然是Promise，则继续反复，直到拿到一个非Promise值。


_async.js
```javascript
/**
* 传入需要使用async的函数
* @param {function} fn
* @return {function}
*/
function _async (fn) {
  return function (...arg) {
    //实现目标6
    let gen = fn.apply(this, arg)
    //实现目标2
    return new Promise(function(resolve, reject){
      _iterator(gen, resolve, reject)
    })
  }
}
//验证是否是Promise
function isPromise(value){
  let s = Object.prototype.toString
  return s.call(value) === '[object Promise]'
}
/**
* @param {generator} gen 迭代对象
* @param {resolve} resolve Promise的成功回调
* @param {reject} reject Promise的失败回调
* @param {any} val 迭代时next需要的参数
* @param {any} err 迭代时产生的错误对象
*/
function _iterator(gen, resolve, reject, val, err){
  try{
    //gen.throw(err) 实现目标4
    var {value, done} = err ? gen.throw(err) : gen.next(val)
  }catch(err){
    //实现目标5
    return reject(err)
  }
  //实现目标7
  //这个功能Promise内部会帮我处理好
  if(done) { return resolve(value) }
  //实现目标3
  if(!isPromise(value)){
    value = Promise.resolve(value)
  }
  ////实现目标1
  value
  .then( res => {
    _iterator(gen, resolve, reject, res)
  }, err => {
    _iterator(gen, resolve, reject, null, err)
  })
}

module.exports = _async
```

使用
```javascript
const _async = require('./_async')
//模拟异步请求
const getTime = function (time, bool){
  return new Promise(function (resolve, reject){
    setTimeout(()=> {
      bool ? resolve(time) : reject(`${time}报错了`)
    }, time)
  });
};


//模拟vue的methods
let methods =  {
  name: 'Vue',
  getPromise: _async(function* (a, b, c){
    console.log(this.name) //查看当前的活动对象
    console.log(a,b,c) //查看当前参数
    var f1 = yield getTime(1000, true);
    console.log(f1);
    var f2 = yield getTime(2000, true);
    console.log(f2);
    var f3 = yield 200;
    console.log(f3);
        //查看内部的错误捕获
    try{
      var f4 = yield getTime(1000, false);
      console.log(f4);
    }catch(err){
      console.log(err)
    }
    //打开这条注释，查看没有try的报错处理
    //throw new Error('函数内报错，')
    console.timeEnd('move')
    return getTime(2000, false)
  })
}
console.time('move')

methods.getPromise(9,8,7)
.then(res => {
  console.log(res)
}).catch(err =>{
  console.log(err)
})
```

大佬略，新手可以参考一下，反正我是写完之后再看function* / yield 和 async/await ，觉得很通透。
