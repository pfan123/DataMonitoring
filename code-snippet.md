# 前端数据监控 

下面的方案中包括性能检测和错误检测，部分方法是hack性质的，将来不一定适用，不过至少当前主流浏览器可行，还有是基于新兴性能接口的，浏览器将来会全面支持吧。

====================================================================
前端写一个监控脚本，实现以下功能：
1、onerror捕获JavaScript异常，对应跨域检测也有方案；
2、addEventListener('error', handler, true)来捕获静态资源异常，包括js、img、css等；
3、Resource Timing API 和 Performance Timing API来进行性能检测和内存检测；
4、扩展XHR原型，检测返回的状态码，如404等，来检测ajax请求失败、错误；
5、通过正则匹配等方式去检测DOM结构的合法性，如ID重复、文档类型未声明之类的；
6、页面的死链接可以通过Nodejs的第三方模块，如request等，来检测。

jserror如何采集,window.onerror

跨域脚本拿不到具体报错信息，然后压缩文件得到的报错信息永远在第一行。
解决方案在于，抽样部分用户，所有页面采用同域脚本代理，注意代码不要压缩。这里对代码混淆安全什么的不讨论。页面我建议后台直出，酱紫便于编程抽样用户。

## 收集脚本执行错误

```
//跨域的资源需要特殊头部支持
function error(msg,url,line){ //可以收集堆栈，出错的文件、行号、列号
   var REPORT_URL = "xxxx/cgi"; // 收集上报数据的信息
   var m =[msg, url, line, navigator.userAgent, +new Date];// 收集错误信息，发生错误的脚本文件网络地址，用户代理信息，时间
   var url = REPORT_URL + m.join('||');// 组装错误上报信息内容URL
   var img = new Image;
   img.onload = img.onerror = function(){
      img = null;
   };
   img.src = url;// 发送数据到后台cgi
}
// 监听错误上报
window.onerror = function(msg,url,line){
   error(msg,url,line);
}
```

[GlobalEventHandlers.onerror](https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror)

window.onerror = function(messageOrEvent, source, lineno, colno, error) { ... }

一共5个参数：

- messageOrEvent {String} 错误信息。直观的错误描述信息，不过有时候你确实无法从这里面看出端倪，特别是压缩后脚本的报错信息，可能让你更加疑惑。
- source {String} 发生错误对应的脚本路径。
- lineno {Number} 错误发生的行号。
- colno {Number} 错误发生的列号。
- error {Object} 具体的 error 对象，继承自 window.Error 的某一类，部分属性和前面几项有重叠，但是包含更加详细的错误调用堆栈信息，这对于定位错误非常有帮助。

## 监控静态资源是否加载成功
```
  //获取加载未成功
  window.addEventListener('error', (e) => {
    if (!(e instanceof ErrorEvent)) {
      errors.push(e);
      console.log("监控未加载成功资源", errors)
    }
  }, true);
```      

监控样式

```      
var links = document.styleSheets;
// links = document.querySelectorAll("link")
var failedCss = [];
Array.from(links).map(function(link){
	if(link.sheet && link.sheet.rules.length == 0){
		failCss.push(link)
	}
})
console.log("failedCss", failedCss)
document.styleSheets[n].cssRules，只有当CSS文件加载下来的时候，document.styleSheets[n].cssRules才会发生变化；但是，由于ff 3.5的安全限制，如果CSS文件跨域的话，JS访问document.styleSheets[n].cssRules会出错
```      

## 统计每个页面的JS和CSS加载时间

在JS或者CSS加载之前打上时间戳，加载之后打上时间戳，并且将数据上报到后台。加载时间反映了页面白屏，可操作的等待时间。

```      
<script>var cssLoadStart = +new Date</script>
<link rel="stylesheet" href="xxx.css" type="text/css" media="all">
<link rel="stylesheet" href="xxx1.css" type="text/css" media="all">
<link rel="stylesheet" href="xxx2.css" type="text/css" media="all">
<sript>
   var cssLoadTime = (+new Date) - cssLoadStart;
   var jsLoadStart = +new Date;
</script>
<script type="text/javascript" src="xx1.js"></script>
<script type="text/javascript" src="xx2.js"></script>
<script type="text/javascript" src="xx3.js"></script>
<script>
   var jsLoadTime = (+new Date) - jsLoadStart;
   var REPORT_URL = 'xxx/cgi?data='
   var img = new Image;
   img.onload = img.onerror = function(){
      img = null;
   };
   img.src = REPORT_URL + cssLoadTime + '-' + jsLoadTime;
</script>
```      

打点-监测页面头部样式加载完成时间：

如何统计头部资源加载呢？我们发现头部内嵌的 JS 通常需等待前面的 JS\CSS 加载完才会执行，是不是可以在浏览器 head 内底部加一句 JS 统计头部资源加载结束点呢？
```  
<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="UTF-8"/>
    <script>
      var start_time = +new Date; //测试时间起点，实际统计起点为 DNS 查询
    </script>
    <!-- 3s 后这个 js 才会返回 -->
    <script src="script.php"></script>  
    <script>
      var end_time = +new Date; //时间终点
      var headtime = end_time - start_time; //头部资源加载时间    
      console.log(headtime);
    </script>
    </head> 
    <body>     
    <p>在头部资源加载完之前页面将是白屏</p>
    <p>script.php 被模拟设置 3s 后返回，head 底部内嵌 JS 等待前面 js 返回后才执行</p>
    <p>script.php 替换成一个执行长时间循环的 js 效果也一样</p>  
    </body>
</html>
```  
经测试发现，统计的头部加载时间正好跟头部资源下载时间相近，而且换成一个执行时间很长的 JS 也会等到 JS 执行完才统计。说明此方法是可行的(具体原因可查看浏览器渲染原理及 JS 单线程相关介绍)。


前端上报：

[bugReport](https://github.com/leolin1229/bugReport)
[前端异常上报](http://blog.kazaff.me/2017/04/06/%E5%89%8D%E7%AB%AF%E5%BC%82%E5%B8%B8%E4%B8%8A%E6%8A%A5/)
[BetterJS](https://github.com/betterjs)

采集日志方式：

1. `<img src="/imgr?">`
http://taobaofed.org/blog/2015/10/28/jstracker-how-to-collect-data/
[360 如何用 1px 的图片做数据统计？](https://www.zhihu.com/question/23105971)
可通过image src跨域请求后端。

2. ajax


[如何设计一个前端监控系统](http://www.codedata.cn/hacknews/148436420521212816)

## 使用performance API 监测页面性能  

[支持性](http://caniuse.com/#feat=nav-timing)

[Performance Api 在网页性能监测的使用和表现差异](https://juejin.im/entry/58abf9c72f301e006bdbc6d8)

PerformanceNavigation 主要反应用户访问页面的形式和关于访问重定向的一些相关信息

PerformanceTiming  文档解析各个步骤的耗时.  这个是我们在测试页面性能的时候需要用的东东,先上个timing的图.

```
.navigationStart 准备加载页面的起始时间
.unloadEventStart 如果前一个文档和当前文档同源,返回前一个文档开始unload的时间
.unloadEventEnd 如果前一个文档和当前文档同源,返回前一个文档开始unload结束的时间
.redirectStart   如果有重定向,这里是重定向开始的时间.
.redirectEnd     如果有重定向,这里是重定向结束的时间.
.fetchStart        开始检查缓存或开始获取资源的时间
.domainLookupStart   开始进行dns查询的时间
.domainLookupEnd     dns查询结束的时间
.connectStart                  开始建立连接请求资源的时间
.connectEnd                     建立连接成功的时间.
.secureConnectionStart      如果是https请求.返回ssl握手的时间
.requestStart                     开始请求文档时间(包括从服务器,本地缓存请求)
.responseStart                   接收到第一个字节的时间
.responseEnd                      接收到最后一个字节的时间.
.domLoading                       ‘current document readiness’ 设置为 loading的时间 (这个时候还木有开始解析文档)
.domInteractive               文档解析结束的时间
.domContentLoadedEventStart    DOMContentLoaded事件开始的时间
.domContentLoadedEventEnd      DOMContentLoaded事件结束的时间
.domComplete        current document readiness被设置 complete的时间
.loadEventStart      触发onload事件的时间
.loadEventEnd       onload事件结束的时间
```

参考资料：

[JavaScript onerror 事件](http://www.w3school.com.cn/js/js_onerror.asp)

[前端代码异常监控](http://rapheal.sinaapp.com/2014/11/06/javascript-error-monitor/)

[支付宝监控sai.js](https://github.com/saijs/sai.js)

[构建web前端异常监控系统–FdSafe](http://www.aliued.cn/2012/10/27/%E6%9E%84%E5%BB%BAweb%E5%89%8D%E7%AB%AF%E5%BC%82%E5%B8%B8%E7%9B%91%E6%8E%A7%E7%B3%BB%E7%BB%9F-fdsafe.html)

[7 天打造前端性能监控系统](http://fex.baidu.com/blog/2014/05/build-performance-monitor-in-7-days/)

[前端代码异常日志收集与监控](http://www.cnblogs.com/hustskyking/p/fe-monitor.html)

[基于node+express+log4js的前端异常信息监控](http://www.html-js.cn/details/4J0pP2FcG)

[站长统计、百度统计、腾讯统计、Google Analytics 哪一统计的数据相对准确些？](https://www.zhihu.com/question/19955915)

[Google Analytics](https://github.com/googleanalytics/)

[前端异常监控](http://kouyun.me/2017/04/07/%E5%89%8D%E7%AB%AF%E5%BC%82%E5%B8%B8%E7%9B%91%E6%8E%A7/)

[bugWatch](https://github.com/wuxiaolan91/bugWatch)

[前端打点](https://gist.github.com/airyland/5633662)

[数据指标 | 网站数据分析体系](https://zhuanlan.zhihu.com/p/26861218)

[前端监控系统落地篇](https://github.com/Rain1368189893/Blog/issues/6)

[前端性能监控：window.performance](https://juejin.im/entry/58ba9cb5128fe100643da2cc)

[前端性能——监控起步](http://www.cnblogs.com/chuaWeb/p/PerformanceMonitoring.html)