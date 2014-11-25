'use strict';

// dataservice module
var dataservice = (function( $ ) {
  var queue=[];
  var queueMetrics={};
  var continueQueue=false;
  var connection = true;
  var checkInternetDeamonInterval = null;
  var j__ = function (str){
    return str;
  };
  var options={
      'route':null, 
      'method':"POST", 
      'data':null, 
      'successCallback':function (data) {}, 
      'completeCallback':function () {},
      'failCallback':function () {},
      'progressbar':$('#dataserviceProgressbar .progress-bar'),
      'async':true,
      'uploadProccess':function () {},
      'downloadProccess':function () {},
      'addQueueOnError':true,
      'queueInterval':50,
      'onOffline':function(){console.log('Got Offline')},
      'onOnline':function(){console.log('Online Again')},
      'removedFromQueue':function () {console.log('Removed')},
      'internetCheckUrl':window.location,
      'dontLeaveMessage':j__("Request is in progress now. Please wait until it is completed to ensure not to lose data.")
  };

  var askNotToLeave = function (){
    return options.dontLeaveMessage;
  };

  var dontAskNotToLeave = function (){
    
  };

  var getCSRFToken = function(){
    
  };

  var setProgress = function(percent){ 
    percent=parseInt(percent * 100);
    options.progressbar.css('width',percent+'%');
    if (percent==100){
          processQueue();
          window.onbeforeunload = dontAskNotToLeave;
          $('.loading-feedback').hide();
          options.progressbar.addClass('progress-bar-success');
          options.progressbar.parent().removeClass('active');
          options.progressbar.html(j__('Completed'));
        }
        else{
          $('.loading-feedback').show();
          options.progressbar.html( sprintf( j__('%s &#37;'),percent));
          options.progressbar.parent().addClass('active');
          options.progressbar.removeClass('progress-bar-success');
        }
  };

  var setProgressCallback = function(callback){
    setProgress = callback;
  };

  var progressContinue = function(){
    window.onbeforeunload = askNotToLeave;
  }

  var ProgressOfTop = function (status) {
    var total=0;
    var loaded=0;
    var FtotalUploads=0;
    var FloadedUploads=0;
    var FtotalDownloads=0;
    var FloadedDownloads=0;

    $.each(grandTotals, function  (index,reqstat) {
      if(reqstat.total.total==reqstat.total.loaded){
        delete grandTotals[index];
      }
      else
      { 
        FtotalUploads += reqstat.upload.total;
        FloadedUploads += reqstat.upload.loaded;

        FtotalDownloads += reqstat.download.total;
        FloadedDownloads += reqstat.download.loaded;

        total += reqstat.total.total;
        loaded += reqstat.total.loaded;
      }
    });

   
    if (total==0){
      setProgress(1);
      window.onbeforeunload = dontAskNotToLeave;
    } else {
      setProgress( (FloadedUploads/FtotalUploads/2) + (FloadedDownloads/FtotalDownloads/2) );
    }

  }
  var setOptions = function(preferredOptions){
    $.extend(options,preferredOptions);
    return this;
  }
  var addToQueue=function(options){
    queue.push(options);
  };
  var processQueue=function(){
    if(queue.length==0 || !continueQueue || !connection) return;
    var next = queue.shift();
    if(!queueMetrics[JSON.stringify(next)]) queueMetrics[JSON.stringify(next)]=0;
    if(queueMetrics[JSON.stringify(next)]++ > 3){
      delete queueMetrics[JSON.stringify(next)];
      if(next.removedFromQueue)
        return next.removedFromQueue();
      else
        return options.removedFromQueue();
    }
    send(next);
  };
  var send = function(preferredOptions){
    if(!isConnected())
      return addToQueue(preferredOptions);
    continueQueue=false;
    if(typeof preferredOptions != "undefined" )
      setOptions(preferredOptions);

    var ajaxSettings = {
       'xhr': function(){
         var xhr = new window.XMLHttpRequest();
         var timestamp = $.now();

         //Upload progress
         xhr.upload.addEventListener("progress", function(evt){
           progressContinue();
           if (evt.lengthComputable) {
              grandTotals[timestamp]={
                upload:{
                  total:evt.total,
                  loaded:evt.loaded
                },
                download:{
                  total:1,
                  loaded:0
                },
                total:{
                  total:evt.total+1,
                  loaded:evt.loaded
                }
              };

             ProgressOfTop("uploading",grandTotals[timestamp]);         
             options.uploadProccess( grandTotals[timestamp] );
             }
         }, false);
       
        //Download progress
        xhr.addEventListener("progress", function(evt){      
          progressContinue();
           if (evt.lengthComputable && grandTotals[timestamp]) {
              
              grandTotals[timestamp].upload.loaded=grandTotals[timestamp].upload.total;
              grandTotals[timestamp].download={
                total:evt.total,
                loaded:evt.loaded
              };
              grandTotals[timestamp].total={
                total:evt.total+grandTotals[timestamp].upload.total,
                loaded:evt.loaded+grandTotals[timestamp].upload.loaded,
              };
             
             ProgressOfTop("downloading",grandTotals[timestamp]);         
             }
         }, false);

         return xhr;
       },
      'headers': {
        'X-PINGOTHER': 'pingpong',
        'contentType': 'plain/text; charset=UTF-8'
      },
      
      'type': options.method,
      'url': '//'+ window.location.host+ "/" + options.route,
      'data': options.data,
      'async' : options.async,
      beforeSend: function(){
        // Handle the beforeSend event
        progressContinue();
      },
      'success': function(data) {
        ProgressOfTop();
        options.successCallback(data); 
      },
      error: function (jqXHR,textStatus,errorThrown) {

        //console.log(jqXHR,textStatus,errorThrown);
        if(!(jqXHR.status >= 200 && jqXHR.status < 304))
          setLostConnection();

        grandTotals={};
        ProgressOfTop();
        continueQueue=true;
        if(options.addQueueOnError)
          addToQueue(preferredOptions);
        options.failCallback();
      },
      complete: function(){
        continueQueue=true;
        ProgressOfTop();
        options.completeCallback();
      }
    }

    if(options.data instanceof FormData){
      ajaxSettings.processData=false;
      ajaxSettings.contentType=false;
    }

    $.ajax(ajaxSettings);

  };
  var isConnected=function(){
    return connection;
  }
  var setGotConnection=function(){
    connection=true;
    options.onOnline();
    checkInternetDeamon("stop");
    options.progressbar.removeClass('progress-bar-success');
  };
  var checkInternetDeamon=function(status){
    if(status=="stop")
      if(checkInternetDeamonInterval)
        clearInterval(checkInternetDeamonInterval);
    if(status=="start"){
      checkInternetDeamonInterval=setInterval(function(){
        $.ajax({
          async:true,
          url: options.internetCheckUrl,
          data:{n:Math.round(Math.random() * 10000)},
          success: function( data ) {
            setGotConnection();
          }
        });
      },1000);
    }
  }
  var setLostConnection=function(){
    connection=false;
    options.onOffline();
    checkInternetDeamon("start");
    options.progressbar.addClass('progress-bar-warning');
  };

  var queueWorker=setInterval(function(){
    processQueue();
  },options.interval);

  var grandTotals=new Object();
  var that = this;
  setProgress(0);

  return {
    send:send,
    setOptions:setOptions,
    queueMetrics:queueMetrics,
    setLostConnection:setLostConnection,
  };

})(jQuery);
