
jQuery Ajax Dataservice
=========
This object handles with progress of Ajax Requests and if you specify an Bootstrap Progress Bar it show status via it.

----------
###Features

 - Send Ajax Request (Of Course),
 - Progress handle,
 - Bootstrap Progress Bar integration,
 - Send data as object or `FormData`
 - On error queue request for retry,
 - On connection lost - went offline queue,
 - On connection restored processing the queu.
 
##Easy Start for developing Web Apps
Just include file and start using it. You are going to like it.

###Usage 
Very similar to `$.ajax`

``` javascript
dataservice
	.setOptions({
		//options
	})
	.send({
		//more options
	});
```
options are saved to objects `options`

###Options
Soon with details and examples. Check the source for now.

###Browser Support
Any browser support jQuery Ajax.

###Dependencies
jQuery v 1.83