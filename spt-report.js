/**
 * sptReport - 上报页面性能，方式：埋点，performance
 * 注意，开启performance timing兼容性 Chrome 6.0及以上、Firefox 7.0及以上、InternetExplorer 9.0及以上、Opera 15.0及以上，Safari (WebKit) 8.0及以上
 * @VERSION: 0.1.0
 * @DATE: 2017-06-09
 * @GIT: https://github.com/pfan123/DataMonitoring.git
 * @Todo  _SPD_Report(url, opts)
 * @author: pfan, 768065158@qq.com
 * 参考资料： https://juejin.im/entry/58abf9c72f301e006bdbc6d8， https://jdc.jd.com/archives/2175
 **/

//分类区域码pid，测速埋点
window._SPT_TIMING = [[ 404, (new Date()).getTime() ]];

window._SPT_PERFORMANCE = true;

window._SPT_TIMING[1] = (new Date()).getTime();
window._SPT_TIMING[2] = (new Date()).getTime();

(function(win, factory){

    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof define === 'function' && define.cmd) {
        define(function(require, exports, module){
            module.exports = factory()
        });
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {

        //导出上报函数
        win._SPD_Report = factory();
    }

})(this, function(){
    var version = '0.1.0';
    var points = ["navigationStart", "unloadEventStart", "unloadEventEnd", "redirectStart", "redirectEnd", "fetchStart", "domainLookupStart", "domainLookupEnd", "connectStart", "connectEnd", "requestStart", "responseStart", "responseEnd", "domLoading", "domInteractive", "domContentLoadedEventStart", "domContentLoadedEventEnd", "domComplete", "loadEventStart", "loadEventEnd"];
    var ua = navigator.userAgent;
    var isWeixinBrowser = /(^|\s|;)+MicroMessenger\/([^;\s$]+)/g.exec(ua);
    var isQQBrowser = /(^|\s|;)+QQ\/([^;\s$]+)/g.exec(ua);
    var browser = {
        android: [/(Android);?[\s\/]+([\d.]+)?/, [1, 2]],
        ios: [/((iPad)|(iPod)|(iPhone)).*\s+OS\s+([\d_]+)/, function(e) {
            return ["ios", e[5] ? e[5].replace(/_/g, ".") : ""]
        }
        ],
        unknow: [/(Android);?[\s\/]+([\d.]+)?/],
        mac: [/((Macintosh)).*\s+OS\sX\s([\d_]+)/, function(e) {
            return ["mac", e[3] ? e[3].replace(/_/g, ".") : ""]
        }],
        win: [/(\(|\s)*(Windows)[^\d.]+([\d\.]+).*((WOW64)*)/gi, [2, 3]]          
    };

    var OS = platform(browser);

    /**
     * 合并多个对象
     *
     * @param {Object} a 对象1
     * @param {Object} b 对象2
     * @return {Object} 返回合并后的对象
     */
    function merge(a, b) {
        if(0 == arguments.length)return;
        var result = {};

        for(var i = 0, len = arguments.length;i<len;i++){
          var obj = arguments[i];
          for (var key in obj){
            result[key] = obj[key];
          } 
        }

        return result;
    }

    /**
     * 设置cookie
     *
     * @param {string} key 键
     * @param {string} val 值
     * @param {string} time 有效期
     */
    function setCookie(key, val, time) {
        time = time || 15;
        var date = new Date();
        date.setTime((new Date()).getTime() + 1e3 * time);
        document.cookie = key + '=' + escape(val) + ';path=/;expires=' + date.toGMTString();
    }

    /**
     * 获取cookie
     *
     * @param {string} key 键
     * @return {string} 返回cookie值
     */
    function getCookie(key) {
        var arr = document.cookie.match(new RegExp('(^| )' + key + '=([^;]*)(;|$)'));
        return null != arr ? unescape(arr[2]) : null;
    }    

    /**
     * [platform 检测访问系统]
     * @param  {[type]} ua [navigator.userAgent]
     * @return {[type]}    [系统及版本]
     */
    function platform(ua) {
        var sys, reg;

        for (var key in browser) {
            reg = browser[key];
            if (sys = reg[0].exec(ua)) {
                if (reg.length > 1) {
                    if (reg[1] instanceof Function) {
                        sys = reg[1](sys)
                    } else if ( Object.prototype.toString.call(reg[1]) == '[object Array]' ) {
                        sys = [sys[reg[1][0]], sys[reg[1][1]]]
                    }
                }

                return key += sys[1] ? " " + sys[1] : ""
            }
        }

        return "other"
    }

    /**
     * [getScreen description 获取屏幕宽高，dpr(devicePixelRadio)设备像素比]
     * @return {[type]} [description]
     */
    function getScreen() {
        return window.screen.width + "," + window.screen.height + " " + (window.devicePixelRatio || 0)
    }       


    //获取 performance 性能信息
    function getPerformanceStart() {
        var e = (window.performance || window.webkitPerformance || {}).timing;
        if (!e) {
            return null
        }
        return e.navigationStart || e.fetchStart
    }


    /**
     * [report 上报函数] 合并上报
     * @param  {[type]} url  目标链接
     * @param  {[type]} data 上报数据
     */
    function report(url, data) {
        //document.createElement('img')操作上报较快，参考https://jsperf.com/new-image-vs-createelement-img
        var image = document.createElement('img');
        var items = [];
        for (var key in data) {
            if (data[key] || data[key] === 0) {
                items.push(key + '=' + encodeURIComponent(data[key]));
            }
        }      

        image.onload = image.onerror = image.onabort = function(e) {
            image.onload = image.onerror = image.onabort = null;
        };

        //拼接数据，类似// fd.3.cn/cesu/r?pid=404&os=ios%209.2&apn=0&wq_area=&_=1.8992875302227117&s1=14&s2=574&s3=284&s4=1198&ext=320%2C480%202%20%20
        image.src = url + (url.indexOf('?') < 0 ? '?' : '&') + items.join('&');
        console.log("image.src", image.src)
    }

     /**
      * [monitorReport 监控上报数据]
      * @param  {[type]} url 目标链接
      * @param  {[object]} defineData 额外的自定义上报数据
      */
    function monitorReport(url, defineData) {
      var defineData = defineData || {};
      var perf = (window.performance || window.webkitPerformance).timing;

      //基础字段
      var baseField = {
        pid: '', //页面分类id
        os: OS ? OS.replace(/%20/g, "") : "other", //替换掉ascii码 空格
        ext: getScreen()
      };

      var perPoints = {}; //Performance测速点
      if(perf){
        //是否设置Performance监测，则拼接增加监测字段
        if (window._SPT_PERFORMANCE === true) {
          var spt = perf.navigationStart;
          var y = 0;
          for(var key in points){
            if('navigationStart' != points[key]){
              y++;
              perPoints['p'+y] = perf[points[key]] > spt ? perf[points[key]] - spt : 0;
            }
          }              
        }             
      }


      //自定义字段
      var definePointsData = {}
      var definePoints = window._SPT_TIMING; //自定义测速点
      if (definePoints && definePoints.length>0) {
          var k = definePoints[0];
          if (!k || !(Object.prototype.toString.call(k) == '[object Array]')) {
              console.error("Invalide data for report", definePoints);
              return ;
          }
          var st = k[1];
          baseField.pid = k[0];

          for (var i = 1, len = definePoints.length; i < len; i++) {
              if( 0 != i ){
                definePointsData['s' + i] = definePoints[i] - st 
              }
          }          
      }

      report(url, merge(baseField, definePointsData, perPoints, defineData))
    }

    var timer;
    timer = setTimeout(function(){
      monitorReport("//fd.3.cn/cesu/r")
    },1000)    

    window.onunload = function(){
      try {
        clearTimeout(timer);
        monitorReport("//fd.3.cn/cesu/r")
      } catch (err){
        throw err;
      }     
    }
    
    return monitorReport;   
})