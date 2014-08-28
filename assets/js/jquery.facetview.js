/*
 * jquery.facetview.js
 *
 * displays faceted browse results by querying a specified index
 * can read config locally or can be passed in as variable when executed
 * or a config variable can point to a remote config
*/

// first define the bind with delay function from (saves loading it separately) 
// https://github.com/bgrins/bindWithDelay/blob/master/bindWithDelay.js
 
(function($) {
	$('#facetview_freetext').autocomplete({ }) ;
    $.fn.bindWithDelay = function( type, data, fn, timeout, throttle ) {
    var wait = null;
    var that = this;

    if ( $.isFunction( data ) ) {
        throttle = timeout;
        timeout = fn;
        fn = data;
        data = undefined;
    }

    function cb() {
        var e = $.extend(true, { }, arguments[0]);
        var throttler = function() {
            wait = null;
            fn.apply(that, [e]);
            };

            if (!throttle) { clearTimeout(wait); }
            if (!throttle || !wait) { wait = setTimeout(throttler, timeout); }
        }

        return this.bind(type, data, cb);
    } ; 
})(jQuery);

// add extension to jQuery with a function to get URL parameters
jQuery.extend({
	
    getUrlVars: function() {
        var params = new Object() ;  
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&') ;
        for ( var i = 0; i < hashes.length; i++ ) {
            hash = hashes[i].split('=');
            if ( hash.length > 1 ) {
                if ( hash[1].replace(/%22/gi,"")[0] == "[" || hash[1].replace(/%22/gi,"")[0] == "{" ) {
                    hash[1] = hash[1].replace(/^%22/,"").replace(/%22$/,"") ; 
                    var newval = JSON.parse(unescape(hash[1].replace(/%22/gi,'"'))) ; 
                } else {
                    var newval = unescape(hash[1].replace(/%22/gi,"")) ; 
                }
                params[hash[0]] = newval ; 
            }
        }
        return params ; 
    },
    getUrlVar: function(name){
        return jQuery.getUrlVars()[name] ; 
    }
})


// now the facetview function
(function($){
    $.fn.facetview = function(options) {
	//the query variable
	var filterq= [];
	var filterqn=-1;
	var sortq="";
	var direction="&sortdir=desc";
	var sizeq= [];
	var startdate="";
	var enddate="";
	var sizefilter="";
	var dummy = false;
	var autosuggestflag = true;
        // a big default value (pulled into options below)
        var resdisplay = [
                [
		    {
		    	'pre':'<div class="row-fluid"><div class="span10"><div style="float:left"><a target="_blank" href="',
		    	'field':'url',
		    	'post':'" onClick="setgo()"'
		    },
		    {
		    	'pre':'id="searchresult" collectionno="',
		    	'field':'col',
		    	'post':'" '
		    	
		    },
		    {
		    	'pre':' uid="',
		    	'field':'uid',
		    	'post':'" >'
		    	
		    },
            {
                  "pre": "<b>",
                  "field": "title",
                  "post": "</b></a></br></div>"
            },
		    {
			'pre':'<div class="span8"><div style="float:right; width:100px; height:5px;"><div class="progress" style="height:10px">\
				<div class="bar" style="width:',
			'field':'score',
			'post':'%;"></div></div></div></div></div></div>'
		    }
                ],
                [
                    {
                        "pre": '<div class="row-fluid" style="height:20px"></div><div class="row-fluid">',
                        "field": "context.#text",
                        "post": '</div>'
                    },
                    {
                        "pre": '<div class="row-fluid" style="height:20px"></div><div class="row-fluid">',
                        "field": "description",
                        "post": '</div>'
                    }
                ],
                [
                 	{
                 		'pre':'<div class="row-fluid"><i class="_searchresult_url">',
                 		"field":"uid",
                 		'post':'</i></div>'
                 	}
                ],
                [
                    {
                    	'pre':'<div class="row-fluid"><i>',
                    	"field":"lastmodified",
                    	'post':'</i></div>'
                    }
                ],
            ] ; 


        // specify the defaults
        var defaults = {
            "config_file": false,           // a remote config file URL
            "facets":[],                    // facet objects: {"field":"blah", "display":"arg",...} 
            "result_display": resdisplay,   // display template for search results
            "display_images": true,         // whether or not to display images found in links in search results
            "description":"",               // a description of the current search to embed in the display
            "search_url":"",                // the URL against which to submit searches
            'default_url_params': {
      'facet':'on',
      'xsl':'json'
    },        
// any params that the search URL needs by default
            "freetext_submit_delay":0,  // delay for auto-update of search results
            "query_parameter":"query",          // the query parameter if required for setting to the search URL
            "query":"",                         // default query value
            "predefined_filters":{},        // predefined filters to apply to all searches
            "paging":{
                "from":0,                   // where to start the results from
                "size":10                   // how many results to get
  },
            "filter":[],
            "nofsuggest":10
        } ; 
     
        // and add in any overrides from the call
        // these options are also overridable by URL parameters
        // facetview options are declared as a function so they are available externally
        // (see bottom of this file)
        var provided_options = $.extend(defaults, options) ; 
        var url_options = $.getUrlVars() ; 
        $.fn.facetview.options = $.extend(provided_options,url_options) ; 
        var options = $.fn.facetview.options ; 
        var first=true;
        // ===============================================
        // functions to do with filters
        // ===============================================
        
        // show the filter values
        var showfiltervals = function(event) {
            event.preventDefault();
            if ( $(this).hasClass('facetview_open') ) {
                $(this).children('i').replaceWith('<i class="icon-plus"></i>') ; 
                $(this).removeClass('facetview_open');
                $('#facetview_' + $(this).attr('rel') ).children().hide();
            } else {
                $(this).children('i').replaceWith('<i class="icon-minus"></i>') ; 
                $(this).addClass('facetview_open');
                $('#facetview_' + $(this).attr('rel') ).children().show();      
            }
        } ; 


        // adjust how many results are shown
        var morefacetvals = function(event) {
            event.preventDefault() ; 
            var morewhat = options.facets[ $(this).attr('rel') ] ; 
            if ('size' in morewhat ) {
                var currentval = morewhat['size'] ; 
            } else {
                var currentval = 10 ; 
            }
            var newmore = prompt('Currently showing ' + currentval + 
                '. How many would you like instead?') ; 
            if (newmore) {
                options.facets[ $(this).attr('rel') ]['size'] = parseInt(newmore);
                $(this).html('show up to (' + newmore + ')') ; 
                dosearch() ; 
                if ( !$(this).parent().parent().siblings('.facetview_filtershow').hasClass('facetview_open') ) {
                    $(this).parent().parent().siblings('.facetview_filtershow').trigger('click') ; 
                }
            }
        } ; 

        // pass a list of filters to be displayed
        var buildfilters = function() {
            var filters = options.facets;
            var thefilters = '<h3>Filter by</h3>';
            for ( var idx in filters ) {
                var _filterTmpl = ' \
                    <div id="facetview_filterbuttons" class="btn-group"> \
                    <a style="text-align:left; min-width:70%;" class="facetview_filtershow btn" \
                      rel="{{FILTER_NAME}}" href=""> \
                      <i class="icon-plus"></i> \
                      {{FILTER_DISPLAY}}</a> \
                      <a class="btn dropdown-toggle" data-toggle="dropdown" \
                      href="#"><span class="caret"></span></a> \
                      <ul class="dropdown-menu"> \
                      <li><a class="facetview_morefacetvals" rel="{{FACET_IDX}}" href="{{FILTER_EXACT}}">show up to ({{FILTER_HOWMANY}})</a></li>\
                      </ul>\
                      </div> \
                  <ul id="facetview_{{FILTER_NAME}}" \
                    class="facetview_filters"></ul> \
                    ';
                if (options.visualise_filters) {
                    var vis = '<li><a class="facetview_visualise" rel="{{FACET_IDX}}" href="{{FILTER_DISPLAY}}">visualise this filter</a></li>' ; 
                    thefilters += _filterTmpl.replace(/{{FACET_VIS}}/g, vis) ; 
                } else {
                    thefilters += _filterTmpl.replace(/{{FACET_VIS}}/g, '') ; 
                }
                thefilters = thefilters.replace(/{{FILTER_NAME}}/g, filters[idx]['field'].replace(/\./gi,'_')).replace(/{{FILTER_EXACT}}/g, filters[idx]['field']);
                if ('size' in filters[idx] ) {
                    thefilters = thefilters.replace(/{{FILTER_HOWMANY}}/gi, filters[idx]['size']) ; 
                } else {
                    thefilters = thefilters.replace(/{{FILTER_HOWMANY}}/gi, 10) ; 
                }
                thefilters = thefilters.replace(/{{FACET_IDX}}/gi,idx) ; 
                if ('display' in filters[idx]) {
                    thefilters = thefilters.replace(/{{FILTER_DISPLAY}}/g, filters[idx]['display']) ; 
                } else {
                    thefilters = thefilters.replace(/{{FILTER_DISPLAY}}/g, filters[idx]['field']) ; 
                }
            }
            $('#facetview_filters').html("").append(thefilters);
            $('.facetview_morefacetvals').bind('click',morefacetvals);
            $('.facetview_filtershow').bind('click',showfiltervals);

        };

        var fixadvfilters = function()
        {
            var advfilterhtml='<div id="facetview_filterbuttons" class="btn-group">\
                  <a style="text-align:left; min-width:70%;" class="facetview_advfiltershow1 btn" rel="advfilterdate" href="">\
                  <i class="icon-plus"></i>\
                  Modified Date</a></div>\
        	  <div id="facetview_advfilterdate">\
        		<span>\
        			<ul>\
        			<a href="javascript:void(0)" class="facetview_filterchoice1"><li sn="0" id="optiondatefrom_Last24">Last 24 hours (0)</li></a>\
        			<a href="javascript:void(0)" class="facetview_filterchoice1"><li sn="1" id="optiondatefrom_pweek">Past Week (0)</li></a>\
        			<a href="javascript:void(0)" class="facetview_filterchoice1"><li sn="2" id="optiondatefrom_pmonth">Past Month (0)</li></a>\
        			<a href="javascript:void(0)" class="facetview_filterchoice1"><li sn="3" id="optiondatefrom_pyear">Past Year (0)</li></a>\
        			<a href="javascript:void(0)" class="facetview_filterchoice1"><li id="optiondatefrom_custom">Custom</li></a>\
        			</ul>\
        			<div class="daterange_facet" >\
        			  <div class="control-group">\
        			    <label class="control-label">From:</label>\
        			    <div class="controls">\
                			<div class="input-prepend">\
        				    <span class="add-on"><i class="icon-calendar"></i></span><input class="span2" readonly id="start_date" size="16" type="text" value="'+moment().subtract('days',1).format("MM/DD/YYYY")+'">\
                			</div>\
        			    </div>\
        			  </div>\
				      <div class="control-group">\
				        <label class="control-label">To:</label>\
				        <div class="controls">\
					      <div class="input-prepend">\
        				  <span class="add-on"><i class="icon-calendar"></i></span><input class="span2" readonly id="end_date" size="16" type="text" value="'+moment().format("MM/DD/YYYY")+'">\
					      </div>\
				        </div>\
        			    <div class="btn btn-primary" id="date_go" style="margin-bottom:10px; -webkit-border-radius:5px; border-radius:5px;">Go!</div>\
        			  </div>\
				    </div>\
        		</span>\
        	  </div>\
        	  <div id="facetview_filterbuttons" class="btn-group" style="margin-top: 9px;"><a style="text-align:left; min-width:70%;" class="facetview_advfiltershow2 btn" rel="advfiltersize" href="">\
                  <i class="icon-plus"></i>\
                  Size</a> </div>\
      	  	      <div>\
        				<ul id="facetview_advfiltersize">\
            			<a href="javascript:void(0)" class="facetview_filterchoice1" style="display:none;"><li id="optionsizefrom_0">&lt100kB (0)</li></a>\
            			<a href="javascript:void(0)" class="facetview_filterchoice1" style="display:none;"><li id="optionsizefrom_1">100kB to 500kB (0)</li></a>\
            			<a href="javascript:void(0)" class="facetview_filterchoice1" style="display:none;"><li id="optionsizefrom_2">500kB to 1MB (0)</li></a>\
            			<a href="javascript:void(0)" class="facetview_filterchoice1" style="display:none;"><li id="optionsizefrom_3">1MB to 10MB (0)</li></a>\
            			<a href="javascript:void(0)" class="facetview_filterchoice1" style="display:none;"><li id="optionsizefrom_4">10MB&gt (0)</li></a>\
            			</ul>\
        	  </div>';
			$('#adv_filters').html("").append(advfilterhtml);
			$('.facetview_advfiltershow1').bind('click', showfiltervals);
			$('.facetview_advfiltershow2').bind('click', showfiltervals);
			$('#facetview_advfilterdate').children().hide();
			$('#facetview_advfiltersize').children().hide();
			$('.daterange_facet').children().hide();
			$('[id^="optiondatefrom_"]').each(
					function() {
						$(this).bind(
								'click',
								function() {
									daterangeclick($(this).html().replace(
											/.?[(]+\d+[)]/g, ""));
								});
					});
			$('[id^="optionsizefrom_"]').each(function() {
				$(this).bind('click', function() {
					sizerangeclick($(this).attr('id').split('_')[1]);
				});
			});
			$('#start_date').focus(function() {
				$(this).attr('old', $('#start_date').val());
			});
			$('#end_date').focus(function() {
				$(this).attr('old', $('#end_date').val());
			});
			$('#start_date').change(function() {
				var a = moment($('#start_date').val());
				var b = moment($('#end_date').val());
				if (a.diff(b) > 0) {
					$(this).val($(this).attr('old'));
					alert("Ooops...\nStart date cannot be after the end date");
				}
				;
			});
			$('#end_date')
					.change(
							function() {
								var a = moment($('#start_date').val());
								var b = moment($('#end_date').val());
								if (a.diff(b) > 0) {
									$(this).val($(this).attr('old'));
									alert("Ooops...\nEnd date cannot be before the start date");
								}
								;
							});
            $('#date_go').click(function(){
            	var datefrom=moment($('#start_date').val()).format('YYYY-MM-DDTHH:mm:ss');
            	var dateto=moment($('#end_date').val()).format('YYYY-MM-DDTHH:mm:ss');
            	var datefrom1=moment($('#start_date').val()).format('YYYY-MM-DD');
            	var dateto1=moment($('#end_date').val()).format('YYYY-MM-DD');
            	startdate="&f.lastmodified.filter=["+datefrom+"TO"+dateto+"]";
            	clickdatefilterchoice("From "+datefrom1+" to "+dateto1);
            });
        };
        
        var clicksizefilterchoice = function(a) {
           
            
            var view="";
            if(a=='0')view="&lt100kB";
            else if(a=='1')view="100kB to 500kB";
            else if(a=='2')view="500kB to 1MB";
            else if(a=='3')view="1MB to 10MB";
            else if(a=='4')view="10MB&gt";
            view1=view.replace(/ /g,'_');
            view1=view1.replace(/&/g,'_');
            var newobj = '<a class="facetview_filterselected facetview_clear ' + 
                'btn btn-info"' + 
                '" alt="remove" title="remove"' +
                ' href="javascript:void(0)" rel="sizefilter"' + ' filtername='+view1+' >' +
                view.replace(/\(.*\)/,'') + ' <i class="icon-remove"></i></a>';
            
            if($('#facetview_selectedfilters').find('a[filtername="'+view1+'"]').attr('filtername')==undefined){
            //filterclick($(this).attr("rel"),$(this).attr('id').split('_')[1]);
            var temp=sizefilter;
            $('a[rel=sizefilter]').each(function(){
            	//alert($(this).attr('filtername'));
            	dummy = true;
            	$(this).click();
            });
            sizefilter=temp;
            $('#facetview_selectedfilters').append(newobj);
            $('.facetview_filterselected').unbind('click',clearsizefilter);
            $('.facetview_filterselected').bind('click',clearsizefilter);
            options.paging.from = 0;
            dosearch();
            }
            else{alert("Filter:"+$('#facetview_selectedfilters').find('a[filtername="'+view+'"]').attr('filtername')+" already exist!!");}
        };
        
        var clearsizefilter = function(event) {
            event.preventDefault();
            $(this).remove();
            sizefilter="";
            if(!dummy)
            	dosearch();
            else
            	dummy =false;
        };
        
        var clickdatefilterchoice = function(a) {
            var view=a;
            view=view.replace(/ /g,'_');
            var newobj = '<a class="facetview_filterselected facetview_clear ' + 
                'btn btn-info"' + 
                '" alt="remove" title="remove"' +
                ' href="javascript:void(0)" rel="datefilter"' + ' filtername='+view+' >' +
                view.replace(/\(.*\)/,'') + ' <i class="icon-remove"></i></a>';
            
            if($('#facetview_selectedfilters').find('a[filtername="'+view+'"]').attr('filtername')==undefined){
            //filterclick($(this).attr("rel"),$(this).attr('id').split('_')[1]);
            	var temp = startdate;
            	$('a[rel=datefilter]').each(function(){
                	//alert($(this).attr('filtername'));
                	dummy = true;
                	$(this).click();
                });
            	startdate = temp;
            $('#facetview_selectedfilters').append(newobj);
            $('.facetview_filterselected').unbind('click',cleardatefilter);
            $('.facetview_filterselected').bind('click',cleardatefilter);
            options.paging.from = 0;
            dosearch();
            }
            else{alert("Filter:"+$('#facetview_selectedfilters').find('a[filtername="'+view+'"]').attr('filtername')+" already exist!!");}
        };
        
        var cleardatefilter = function(event) {
            event.preventDefault();
            $(this).remove();
            startdate="";
            if(!dummy)
            	dosearch();
            else
            	dummy =false;
        };
        
        
        var sizerangeclick = function(a)
        {
            switch(a)
            {
           
            case '0':
            	sizefilter="&f.size.filter=[*TO102400]";
            	break;
            	
            case '1':
            	sizefilter="&f.size.filter=[102400TO512000]";
            	break;
            	
            case '2':
            	sizefilter="&f.size.filter=[512000TO1048576]";
            	break;
            	
            case '3':
            	sizefilter="&f.size.filter=[1048576TO10485760]";
            	break;
            	
            case '4':
            	sizefilter="&f.size.filter=[10485760TO*]";
            	break;
            
            default:
            	sizefilter="";	
            }
            clicksizefilterchoice(a);
        };
        
        var activedate=-1;
        
        var daterangeclick = function(b)
        {
            $('.daterange_facet').children().hide();
            switch(b)
            {
            case 'Last 24 hours':
        	startdate="&f.lastmodified.filter=["+moment().subtract('days',1).format('YYYY-MM-DDTHH:mm:ss')+"TO*]";
        	activedate=0;
        	break;
        	
            case 'Past Week':
            	startdate="&f.lastmodified.filter=["+moment().subtract('days',7).format('YYYY-MM-DDTHH:mm:ss')+"TO*]";
            	activedate=1;
        	break;
        	
            case 'Past Month':
            	startdate="&f.lastmodified.filter=["+moment().subtract('months',1).format('YYYY-MM-DDTHH:mm:ss')+"TO*]";
            	activedate=2;
        	break;
        	
            case 'Past Year':
            	startdate="&f.lastmodified.filter=["+moment().subtract('years',1).format('YYYY-MM-DDTHH:mm:ss')+"TO*]";
            	activedate=3;
        	break;
   
            case 'Custom':
        	$('.daterange_facet').children().show();
                $('#start_date').datepicker();
                $('#end_date').datepicker();
                
        	break;
        	
            default:
        	startdate="";
            	enddate="";
            }
            if(b!='Custom')clickdatefilterchoice("From "+b);
        };
        
	// match options filter and data filter
	var findfilterindata = function(filter)
	{
		var found="false";
		for(var i in options.data["facets"])
			for(var n in options.data["facets"][i])
			{	
				if(n == filter){
				found="true";
				return i;}
			}
		if(found!=true)
		return -1;
	};
	
	var filterquery = new Array();
	var nf=-1;

	var removefilterquery = function(facet,filtername)
	{
	
		var s=validatefilteradd(facet,filtername);
		if(s==-1);
			
		else
		{
			filterquery.splice(s,1);
			
			nf--;
		}
		
	};
		
	var removeallcontenttypefilterquery = function(){
		var s=validatefilteradd('contenttype','*');
		while(s!=-1){
			filterquery.splice(s,1);
			nf--;
			s=validatefilteradd('contenttype','*');
		}
	};
		
	var validatefilteradd = function(facet,filtername)
		{
			if(filtername == '*'){
				for(var i in filterquery)
				{
					if(filterquery[i]['0']==facet)
						return i;
		}
			}
			else{
				for(var i in filterquery)
				{
					if(filterquery[i]['0']==facet && filterquery[i]['1']==filtername)
						return i;
				}
			}
			return -1;
		};

	var viewfilter = function()
	{
		for(i in filterquery)
		{
			alert(JSON.stringify(filterquery[i]));
		}
	};
		
	var addfilterquery = function(facet,filtername)
		{
			
	    	var s=validatefilteradd(facet,filtername);
	        if(s==-1)
	        {
	        	nf++;
	        	filterquery[nf]={'0':facet,'1':filtername};
	        }
	       
		};
	
	var filterclick = function(rel,html)
	{	
	
		addfilterquery(rel,escape(html.replace(/%%%/g,' ')));
	};
	
	var appendfilterstoquery = function(a)
	{
		var b="";
		for(var i in filterquery)
		{
			b=b+"&f."+filterquery[i]['0']+".filter="+filterquery[i]['1'];
		}
		
		return(a+b);
	};

        // set the available filter values based on results
        var putvalsinfilters = function(data)
	{
	// for each filter setup, find the results for it and append them to the relevant filter
	for ( var each in options.facets ) {
        $('#facetview_' + options.facets[each]['field'].replace(/\./gi,'_')).children().remove();
		var n = findfilterindata(options.facets[each]['field']);
		if(n==-1)continue;
		var records = data["facets"][n][options.facets[each]['field']];
		var totcount=records[0];
		var a="@name";
		if(options.facets[each]['field']=='lastmodified')
		{
		for ( var item in records[1]) {
                    var append = '<li class="fltchoice"><a id="fltchoice_'+records[1][item][a]+ 
                        '" rel="' + options.facets[each]['field'] + '"   class="facetview_filterchoice"'+' href="#">' + moment(parseInt(records[1][item][a])).format("dddd, MMMM Do YYYY, h:mm:ss a") +
                        ' (' + records[1][item]['#text'] + ')</a></li>';
                    $('#facetview_' + options.facets[each]['field'].replace(/\./gi,'_')).append(append);
                }
		}
		else if(options.facets[each]['field']=='indexdate')
		{
			for ( var item in records[1]) {
	                    var append = '<li class="fltchoice"><a id="fltchoice_'+records[1][item][a]+ 
	                        '" rel="' + options.facets[each]['field'] + '"   class="facetview_filterchoice"'+' href="#">' + moment(parseInt(records[1][item][a])).format("dddd, MMMM Do YYYY, h:mm:ss a") +
	                        ' (' + records[1][item]['#text'] + ')</a></li>';
	                    $('#facetview_' + options.facets[each]['field'].replace(/\./gi,'_')).append(append);
	                }
		}
		else if(options.facets[each]['field']=='size')
		{
			for ( var item in records[1]) {
			    var sz=parseInt(records[1][item][a]);
			    var type="bytes";
			    if(sz>1024){sz=sz/1024;type="KB";}
			    if(sz>1024){sz=sz/1024;type="MB";}
	                    var append = '<li class="fltchoice"><a id="fltchoice_'+records[1][item][a]+ 
	                        '" rel="' + options.facets[each]['field'] + '"   class="facetview_filterchoice"'+' href="#">' + Math.floor(sz) + " " + type +
	                        ' (' + records[1][item]['#text'] + ')</a></li>';
	                    $('#facetview_' + options.facets[each]['field'].replace(/\./gi,'_')).append(append);
	                }
		}
		else{
                for ( var item in records[1]) {
                    var append = '<li class="fltchoice"><a id="fltchoice_'+records[1][item][a].replace(/ /g,'.')+ 
                        '" rel="' + options.facets[each]['field'] + '"   class="facetview_filterchoice"'+' href="#" forcloudrel="'+records[1][item]['#text']+'" forcloudtag="'+records[1][item][a]+'">' + records[1][item][a] +
                        ' (' + records[1][item]['#text'] + ')</a></li>';
                    $('#facetview_' + options.facets[each]['field'].replace(/\./gi,'_')).append(append);
                }}
                if ( !$('.facetview_filtershow[rel="' + options.facets[each]['field'].replace(/\./gi,'_') + '"]').hasClass('facetview_open') ) {
                    $('#facetview_' + options.facets[each]['field'].replace(/\./gi,'_') ).children().hide();
                }
            }
		
            $('.facetview_filterchoice').bind('click',clickfilterchoice);
        }
        
        
  //function to check if string only contains numbers
        var isNumber = function(string){
        	var isnum = /^\d+$/.test(string);
        	return isnum;
        }
        
        // ===============================================
        // functions to do with building results
        // ===============================================

        // read the result object and return useful vals depending on if ES or SOLR
        // returns an object that contains things like ["data"] and ["facets"]
        var parseresults = function(dataobj) {
            var resultobj = new Object();
            resultobj["records"] = new Array();
            resultobj["start"] = "";
            resultobj["found"] = "";
           
                for (var item in dataobj.results.result) {
                    if(item=="@no")
                    {
                	resultobj["records"].push(dataobj.results.result);
                	resultobj["found"] = dataobj.results['@hits'];
                	break;
                    }
                    resultobj["records"].push(dataobj.results.result[item]);
                    resultobj["found"] = dataobj.results['@hits'];
                }
	if(dataobj.facets)
	{
	resultobj["facets"] = new Object();
	if(dataobj.facets.facet)
	{
		var fname="";
		var count="";
		var facetsobj = new Object();
                for (var item in dataobj.facets.facet) 
		{
			var values = new Object();
			if(item == "@name")
			fname=dataobj.facets.facet[item];
			else if(item=="@count")
			count=dataobj.facets.facet[item];
			else if(item=="int")
			{
                    		for (var thing in dataobj.facets.facet[item])
				{
                        		values[thing]=dataobj.facets.facet[item][thing];
				}
				facetsobj[fname]= new Object();
				facetsobj['name']=fname;
				facetsobj[fname]=[count,values];
			}
		}
                resultobj["facets"][0] = facetsobj;
		options.noffilters=1;
	}
	else
	{	
		var n=0;
		for(n in dataobj.facets)
		{
			var fname="";
			var count="";
			var facetsobj = new Object();
            for (var item in dataobj.facets[n]) 
			{
				var values = new Object();
				if(item == "@name"){
					fname=dataobj.facets[n][item];
					if(fname=="lastmodified" || fname=="size")
					{
						facetsobj[fname]=new Object();
						
						for(var t1 in dataobj.facets[n]['int'])
						{
							var data=new Array();
							data[0]=dataobj.facets[n]['int'][t1]['@from'];
							data[1]=dataobj.facets[n]['int'][t1]['@to'];
							data[2]=dataobj.facets[n]['int'][t1]['#text'];
							facetsobj[fname][t1]=data;
						}
						
					}
				}
				else if(item=="@count")
				count=dataobj.facets[n][item];
				else if(item=="int")
				{
                    for (var thing in dataobj.facets[n][item])
					{
						if(thing=='@name')
						{
							values['0']=dataobj.facets[n]['int'];
							break;
						}
                       		 		values[thing]=dataobj.facets[n][item][thing];
					}
					facetsobj[fname]= new Object();
					facetsobj['name']=fname;
					facetsobj[fname]=[count,values];
				}
			}
            resultobj["facets"][n] = facetsobj;
		}
		options.noffilters=n;
	}
	}
        return resultobj;
        }

        // decrement result set
        var decrement = function(event) {
            event.preventDefault()
            if ( $(this).html() != '..' ) {
                options.paging.from = options.paging.from - options.paging.size
                options.paging.from < 0 ? options.paging.from = 0 : ""
                dosearch();
            }
        }

        // increment result set
        var increment = function(event) {
            event.preventDefault()
            if ( $(this).html() != '..' ) {
                options.paging.from = parseInt($(this).attr('href'))
                dosearch()
            }
        }
		
        // write the metadata to the page
        var putmetadata = function(data) {
            if ( typeof(options.paging.from) != 'number' ) {
                options.paging.from = parseInt(options.paging.from)
            }
            if ( typeof(options.paging.size) != 'number' ) {
                options.paging.size = parseInt(options.paging.size)
            }
            var metaTmpl = ' \
              <div class="pagination" style="float:center"> \
                <ul> \
                  <li class="prev"><a id="facetview_decrement" href="{{from}}">&laquo; back</a></li> \
                  <li class="active"><a>{{from}} &ndash; {{to}} of {{total}}</a></li> \
                  <li class="next"><a id="facetview_increment" href="{{to}}">next &raquo;</a></li> \
                </ul> \
              </div> \
              ';
            $('#facetview_metadata').html("Your search for  <b id=\"query\"></b>  did not match any documents..." +
            		"<br/><br/>" +
            		"* Suggestions: Make sure all words are spelled correctly.</br>" +
            		"* Use similar words or synonyms.</br>" +
            		"* Try more general keywords.").find('#query').text(options.query);
            if (data.found) {
                var from = options.paging.from + 1
                var size = options.paging.size
                !size ? size = 10 : ""
                var to = options.paging.from+size
                data.found < to ? to = data.found : ""
                var meta = metaTmpl.replace(/{{from}}/g, from);
                meta = meta.replace(/{{to}}/g, to);
                meta = meta.replace(/{{total}}/g, data.found);
                $('#facetview_metadata').html("").append(meta);
                $('#facetview_decrement').bind('click',decrement)
                from < size ? $('#facetview_decrement').html('..') : ""
                $('#facetview_increment').bind('click',increment)
                data.found <= to ? $('#facetview_increment').html('..') : ""
            }

        }

        var canplay = function(ext){
        	 var canPlay = false;
        	   var v = document.createElement('video');
        	   if(v.canPlayType && v.canPlayType('video/'+ext).replace(/no/, '')) {
        	       canPlay = true;
        	   }
        	   return canPlay;
        }
        
        var _uid="";
        // given a result record, build how it should look on the page
        var buildrecord = function(index) {
            var record = options.data['records'][index]
            var result = '<tr><td>';
            var context_flag=false;
            // add first image where available
            if (options.display_images) {
                var recstr = JSON.stringify(record['url']);
                var colid = record['col'];
               
                recstr = recstr.substring(1,recstr.length - 1);
                recstrf = recstr.substring(1,recstr.length);
                
                var t = recstr.substring(recstr.lastIndexOf('.')+1).toLowerCase();
               
                if(recstr.match('^http')||recstr.match('^https')){
                	if( t == "jpg" || t == "jpeg" || t == "png" || t == "gif" || t == "bmp" ){
                		var img = new Array();
                		img[0]=recstr;
                		var isFile = false;
                	}if(t == "mpeg" || t == "mp4" || t == "flv" || t == "mpg"){
                		var play = canplay(t);
                		var img = new Array();
                		img[1]=recstr;
                		var isFile = false;
                	}
                }else if(recstr.match('^/') || recstrf.match('^:')){
                	if( t == "jpg" || t == "jpeg" || t == "png" || t == "gif" || t == "bmp"   ){
                		var img = new Array();
                		img[0]=recstr;
                		var isFile = true;
                	}if(t == "mpeg" || t == "mp4" || t == "flv" || t == "mpg" ) {
                		var play = canplay(t);
                		var img = new Array();
                		img[1]=recstr;
                		var isFile = true;
                }}
                
                var recstri = JSON.stringify(record['_autocomplete'])
               
                var regexi = /(http:\/\/\S+?\.(jpg|png|gif|jpeg))/
                var imgi = regexi.exec(recstri)
                if (imgi && !img) {
                	var imgistack = new Array();
                	for(var tempi in imgi)
                    
                	if(imgi[tempi].toString().match('^http'))
                		if(imgi[tempi].match(/jpeg$/)!=null||imgi[tempi].match(/gif$/)!=null||imgi[tempi].match(/png$/)!=null||imgi[tempi].match(/jpg$/)!=null){
                        	if(imgistack.indexOf(imgi[tempi].toString())==-1){
                    			imgistack.push(imgi[tempi].toString());
                    			result += '<a href="' +imgi[tempi] + '" rel="prettyPhoto"> <img class="thumbnail" style="float:left; width:100px; margin:0 5px 10px 0; max-height:150px;" src="' + imgi[tempi] + '" /></a></br>'	
                        	}
                		}
                }
            	
                
            }
            // add the record based on display template if available
            var display = options.result_display
            var lines = ''
            for (var lineitem in display) {
                line = ""
                for (object in display[lineitem]) {
                    var thekey = display[lineitem][object]['field'];
                    if(thekey=='description' && context_flag==true)continue;
                    parts = thekey.split('.');
                    // TODO: this should perhaps recurse..
                    if (parts.length == 1) {
                        var res = record;
                    } else if (parts.length == 2) {
                        var res = record[parts[0]];
                    } else if (parts.length == 3) {
                        var res = record[parts[0]][parts[1]];
                    }
                    var counter = parts.length - 1
                    if (res && res.constructor.toString().indexOf("Array") == -1) {
                        var thevalue = res[parts[counter]]
                      
                        if(parts=='uid')_uid=thevalue;
                   
                        if(parts=='title'&&JSON.stringify(thevalue).trim()=='[]')thevalue=_uid;
                        if(parts=='lastmodified')thevalue=moment(thevalue).format("dddd, MMMM Do YYYY, h:mm:ss a");
                        if(parts=='context,#text')
                        {
                            	context_flag=true;
                            	var thevalue1=" ";
                            	var b=JSON.stringify(record['context']['highlight']);
                    	    	if(b.split(',').length==1)
                    	    	{
                    	    		if(thevalue!=undefined)
                            			thevalue1=thevalue1+(thevalue[0]==undefined?"":thevalue[0])+"<B>"+record['context']['highlight']+"</B>"+(thevalue==undefined?"":thevalue);
                    	    		else
                    	    			thevalue1=thevalue1+"<B>"+record['context']['highlight']+"</B>";
                    	    	}
                    	    	else
                        	for(a in thevalue)
                        	{
                        	    if(record['context']['highlight'][a])
                        		thevalue1=thevalue1+thevalue[a]+"<B>"+record['context']['highlight'][a]+"</B>";
                        	}
                        	thevalue=thevalue1;
                        }
                    } else {
                        var thevalue = []
                        for (var row in res) {
                            thevalue.push(res[row][parts[counter]])
                        }
                    }
                    if (thevalue && thevalue.length) {
                        display[lineitem][object]['pre'] 
                            ? line += display[lineitem][object]['pre'] : false
                        if ( typeof(thevalue) == 'object' ) {
                            for (var val in thevalue) {
                                val != 0 ? line += ', ' : false
                                line += thevalue[val]
                            }
                        } else {
                            line += thevalue
                        }
                        display[lineitem][object]['post'] 
                            ? line += display[lineitem][object]['post'] : line += ' '
                    }
                }
                if(lineitem==1)
                    {
               
                    if(!isFile){
                    if (img) {
                    	//alert(img);
                    	if(img[0] != null)
                        lines += '<a href="' +img[0] + '" rel="prettyPhoto"> <img class="thumbnail" style="float:left; width:100px; margin:0 5px 10px 0; max-height:150px;" src="' + img[0] + '" /></a>'
                        else{
                        	if(play)
                        		lines += '<video thumbid="_video" width="100" height="100" poster ="images/play.jpg" src="' + img[1] + '"/></a>'
                        	else
                        		lines += '<a href="' + img[1] + '"><img src="images/play.jpg"/></a>'	
                        }
                        	
                    }}
                    else{
                    	if(img){
                    	if(img[0] != null)
                            lines += '<a href="servlet/FileServlet?url=' + img[0] + '&col='+colid+'" rel="prettyPhoto"> <img class="thumbnail" style="float:left; width:100px; margin:0 5px 10px 0; max-height:150px;" src="servlet/FileServlet?url=' + img[0] + '&col='+colid+'" /> </a>'
                            else{
                            	if(play)
                            		lines += '<video thumbid="_video" width="100" height="100" poster ="images/play.jpg" src="servlet/FileServlet?url=' + img[1] + '&col='+colid+'"/>'
                            	else
                            		lines += '<a href="servlet/FileServlet?url=' + img[1] + '&col='+colid+'"> <img src="images/play.jpg"/></a>'	
                            }
                        }
                    	}
                    }
                if (line) {
                    lines += line.replace(/^\s/,'').replace(/\s$/,'').replace(/\,$/,'');
                }
            }
            lines ? result += lines : result += JSON.stringify(record,"","    ")
            result += '</td></tr>'
            return result;
        }
        

        // put the results on the page
        showresults = function(sdata) {
        	
            var data = parseresults(sdata);
            options.data = data;
            
            //show suggestion if available
            var suggest = sdata["results"]['@suggest'];
            var suggestexist = false;
            var temp = "";
            if(suggest.trim() != ''){
            	suggestexist = true;
            	temp += "<table class='table table-condensed'><tbody>";
            	temp += "<tr><td><i><small><b>Did you mean : <a href='#' id='auto_suggested' data-value='"+suggest.trim()+"'>" + suggest.trim() + "</a> ?</b></small></i></td></tr>";
            	temp += "</tbody></table>";
			 $(document).on('click', '#auto_suggested', function ( event ) {
              event.preventDefault(); 	
			
				options.query = $(this).attr('data-value').trim() ; 
				
		    //refresh query
			q=" ";
				// make the search query
			//q="query="+encodeURI(escape(options.query));
			q="query="+encodeURIComponent(options.query);
			// add default params
			q=adddefaultparams(q);
			// add facet filter values to query
			q=appendfilterstoquery(q);
			// add extra filters to query
			q=appendextrafilterstoquery(q);
			// add size values of filter
			q=addsizevalues(q);
			//update sort and direction variables
			q+=sortq;
			q+=direction;
			// update start page variable on new query
			if(oldsearchquery != encodeURIComponent(options.query).trim())
				options.paging.from = 0;
			// update the page variable
			var d = parseInt(options.paging.from) == 0 ? d = 1 : d = (parseInt(options.paging.from) / parseInt(options.paging.size))+1;
			q=q+"&page="+parseInt(d);
			q=q+"&pagesize="+options.paging.size;
			//update with the daterange variables
			q+=startdate;
			//addsizefacetsilent
			q=adddefaultsizefacet(q);
			//update query with size filters
			q+=sizefilter
			//q=trim(q);
			
		 
			if(q.trim() == oldquery.trim()){
		
				return;
			}

			oldquery = q.trim();
			oldsearchquery = encodeURIComponent(options.query).trim();

			//addlastmodifiedfacetsilent
			q=adddefaultdatefacet(q);
			
						$.getJSON(facetview_vars.search_url,"callback=?&"+q,
						function(data) {
							createCookie("searchblox_plugin_query",q,0);
							$.getJSON(facetview_vars.report_servlet,
							"callback=?&gettopclicks=yes&nodocs=5&query="+options.query,function(_data){
								data=_data.response;
								
								var temphtml = "<h3>Most Viewed</h3></br>";
								if(data!="nodocs"&&data!="queryerror"&&data!="")
									 for(var x in data)
											for(var y in data[x])
												temphtml += data[x][y];
									$('#facetview_leftcol_topclicks').html(temphtml);
									if(data!="nodocs"&&data!="queryerror"&&data!="")$('#facetview_leftcol_topclicks').show();
									else $('#facetview_leftcol_topclicks').hide();
							});
							 
							showresults(data);
							$('#facetview_freetext').val(options.query); 
							hideloader();
						});
				
				});
		
            } 
            else{
            	suggestexist = false;
            }
            if(suggestexist){
            	$('#suggest').html(temp);
            }
            else{
            	$('#suggest').html('');
            }
            
            //show ads if available
            var adsexist = false;
            if(sdata["ads"]){
            	
            	var temp = "<table class='table'><tbody>";
            	temp += "<tr><td><i><small>Results from Ads</small></i></td></tr>";
            	for(temp1 in sdata["ads"]){
            		adsexist = true;
            		var ads_graphic_url = sdata["ads"][temp1]['@graphic_url'];
            		temp += "<tr>\
            				<td>\
            				<div class=\"row-fluid\">\
            				<div class=\"span10\">\
            				<div style=\"float:left\">\
            				<a style=\"color:red\" href=\"" + sdata["ads"][temp1]['@url'] + "\"><b>" + sdata["ads"][temp1]['@title'] + "</b></a><br></div></div></div>";
            		
            		temp += '<div class="row-fluid" style="height:20px"></div><div class="row-fluid">';
            		if(ads_graphic_url!='')
            			temp += '<a href="'+ sdata["ads"][temp1]['@graphic_url'] +'" rel="prettyPhoto"> <img class="thumbnail" style="float:left; width:100px; margin:0 5px 10px 0; max-height:150px;" src="'+ sdata["ads"][temp1]['@graphic_url'] +'" /> </a>';
            		temp += sdata["ads"][temp1]['@description'];
            		var tempurl = sdata["ads"][temp1]['@url'];
            		var t = tempurl.substring(tempurl.lastIndexOf('.')+1).toLowerCase();
            		if( t == "jpg" || t == "jpeg" || t == "png" || t == "gif" || t == "bmp" ){
            			temp += '<a href="'+ sdata["ads"][temp1]['@url'] +'" rel="prettyPhoto"> <img class="thumbnail" style="float:left; width:100px; margin:0 5px 10px 0; max-height:150px;" src="'+ sdata["ads"][temp1]['@url'] +'" /> </a>';
            		}
            		temp += '</div>';
            		temp += '<div class="row-fluid"><i class="_searchresult_url">' + sdata["ads"][temp1]['@url'] + '</i></div>';
            		
            		
            		temp += '</tr>';
            		
            	}
            		
            	temp += "</tbody></table>";
            	if(adsexist)
            		$('#ads').html(temp);
            	else
            		$('#ads').html('');
            }
	    if(data["facets"])
            putvalsinfilters(data);
            // put result metadata on the page
            putmetadata(data);
            // put the filtered results on the page
            $('#facetview_results').html("");
            var infofiltervals = new Array();
            $.each(data.records, function(index, value) {
                // write them out to the results div
                $('#facetview_results').append( buildrecord(index) );
                $('#facetview_results tr:last-child').linkify()
            });
             
            fixadvfiltercount();
            if(options.data['found'] && first==true)
            	{
            		$('#sort_btn_aligner').show('slow');
            		$('#facetview_leftcol').show('slow');
            		$('#facetview-searchbar').attr('style','display:inline; float:left; width:100%;');
            		$('.header').attr('style','padding:5px;margin-top:15px;');
    				first=false;
            	}
    
            $('[id=searchresult]').each(function(){ 		

            	if($(this).attr('href').match('^db')){
            		var temp = facetview_vars.search_url.split('servlet')[0] + 'servlet/DBServlet?col=' + $(this).attr('collectionno') + '&id=' + $(this).attr('uid');
            		
            		$(this).attr('href',temp);	

            	}
            	else if($(this).attr('uid').split(':')[0] == 'file'){
            		
            		var temp = facetview_vars.search_url.split('servlet')[0] + 'servlet/FileServlet?url=' + $(this).attr('href') + '&col=' + $(this).attr('collectionno');
            		

            		if($(this).attr('href').match('^http')){
            			
            			$(this).parent().parent().parent().parent().children().find('._searchresult_url').html($(this).attr('href'));
            		}
            		if(!$(this).attr('href').match('^http')){ 
            			$(this).attr('href',temp); 		

            		}
            		
            	}
            	else if($(this).attr('href').split(':')[0] == 'eml'){
            		var temp = facetview_vars.search_url.split('servlet')[0] + 'servlet/EmailViewer?url=' + $(this).attr('uid') + '&col=' + $(this).attr('collectionno');
            		
            		$(this).attr('href',temp);	

            	}    
            })
    		
       
	    //update total number of results
            if(options.data['found'])
            	{
            		$('#nofresults').html(options.data['found']+" results found");
            		$('#sort_btn_aligner').show();
            		$('#facetview_leftcol_percolator').show();
            	}
            else
            	{
            		$('#nofresults').html("0 results found");
            		$('#sort_btn_aligner').hide();
            	}

           $('[thumbid=_video]').each(function(){
            	$(this).bind('click',function(){
            	$(this).attr('controls','')
            	$(this).attr('height','240')
            	$(this).attr('width','320')
            	$(this).attr('poster','')
            	})
            })
 
          $('a[rel^="prettyPhoto"]').prettyPhoto();
            $('[id=searchresult]').each(function(){
            	$(this).bind('click',function(){
            		
            		var clickedcol = $(this).attr('collectionno');
            		var clickeduid = $(this).attr('uid');
            		var clickedtitle = $(this).children().html();
            		var clickedurl = escape($(this).attr('href'));
            //		alert("addclick=yes&col="+clickedcol+"&uid="+clickeduid+"&title="+clickedtitle+"&url="+clickedurl+"&query="+options.query);
            		$.ajax({
                        type: "get",
                        url: "",
                        data:"addclick=yes&col="+clickedcol+"&uid="+clickeduid+"&title="+clickedtitle+"&url="+clickedurl+"&query="+escape(options.query)
            		});
            	});
            }); 
            $('[id=topclickedresult]').each(function(){
            	$(this).bind('click',function(){
            		
            		var clickedcol = $(this).attr('collectionno');
            		var clickeduid = $(this).attr('uid');
            		var clickedtitle = $(this).children().html();
            		var clickedurl = $(this).attr('href');
            	//	alert("addclick=yes&col="+clickedcol+"&uid="+clickeduid+"&title="+clickedtitle+"&url="+clickedurl+"&query="+options.query);
            	});
            });
           
            //tagcloud preperation removed
          
            //test percolator
            {
            	$('#facetview_leftcol_percolator > a').bind('click',function(){
            		
            		bootalert("Register Alert","");
            	})
            }
            $('.input-prepend,.input-append').css("margin-left", "0");
        }

        // ===============================================
        // functions to do with searching
        // ===============================================

	//add default params to query
	var adddefaultparams = function ( a )
	{	
		var b="";
		for(each in options.default_url_params)
		{
			b=b+"&"+each+"="+options.default_url_params[each];
		}
		for(each in options.facets)
		{
			b=b+"&facet.field="+options.facets[each]['field'];
			if(options.facets[each]['interval']!=undefined && options.facets[each]['interval'].trim()!=""){
				b += "&f."+options.facets[each]['field']+".interval="+options.facets[each]['interval']
		}
		}
		
		return (a+b);
	}

	// add extra filters to query
	var appendextrafilterstoquery = function( a ){
		var b = "";
		for(each in options.filter)
		{

			if(options.filter[each].split(',').length > 1){
				var c = options.filter[each].split(':')[1].split(',');
				for(var d = 0 ; d<c.length ; d++){
					b=b+"&filter="+options.filter[each].split(':')[0]+":"+c[d];

				}
			}
			else{
				b=b+"&filter="+options.filter[each];
			}
		}

		return (a+b);

	}

	var addfiltervalues = function(a)
	{
		var b="";
		for(var i=0;i<filterq.length;i++)
		{
			b=b+filterq[i];
		}
		return(a+b);
	}
	
	var addsizevalues = function(a)
	{
	    	var b="";
		for(var i in sizeq)
		{
		    for(j in options['facets'])
			if(options['facets'][j]['field']==i)
			b=b+'&f.'+i+'.size='+options['facets'][j]['size'];
		}
		return(a+b);
	}

	var adddefaultdatefacet = function(q)
	{
		
		var b='&facet.field=lastmodified&f.lastmodified.range=['+moment().subtract("days",1).format("YYYY-MM-DDTHH:mm:ss")+'TO*]&f.lastmodified.range=['+moment().subtract('days',7).format("YYYY-MM-DDTHH:mm:ss")+'TO*]&f.lastmodified.range=['+moment().subtract('months',1).format("YYYY-MM-DDTHH:mm:ss")+'TO*]&f.lastmodified.range=['+moment().subtract('years',1).format("YYYY-MM-DDTHH:mm:ss")+'TO*]';
		return(q+b);
	}
	
	var adddefaultsizefacet=function(q)
	{
		var b='&facet.field=size&f.size.range=[*TO102400]&f.size.range=[102400TO512000]&f.size.range=[512000TO1048576]&f.size.range=[1048576TO10485760]&f.size.range=[10485760TO*]';
		return(q+b);
	}
	
	
	var trim = function(s)
	{
		var a=s.replace(" ","");
		return(a);
	}
	
	var contains = function (a,e) {
		for (var i = 0; i < a.length; i++) {
		if (a[i] == e) {
		return true;
		}
		}
		return false;
		}
        	
	var z= new Array();
    // execute a search
	var oldquery = "";
	var oldsearchquery = "";
	
	var percolate = function(name, email, frequency, nodocs){
	
		$.ajax({
            type: "get",
            url: facetview_vars.search_url,
            data:q+"&percolatoremail="+email+"&percolatorqueryname="+name+"&percolatorqueryfreq="+frequency+"&percolatorquerynodocs="+nodocs,
            success: function(data){
            	
            }
		});
	}
	
	var bootalert = function(heading, msg, btnClass) {
		$("#dataAlertModal .modal-footer button").removeClass().addClass("btn").addClass(btnClass);
		if (!$('#dataAlertModal').length) {
			$('body').append('\
<div id="dataAlertModal" class="modal fade" role="dialog" aria-labelledby="dataAlertLabel" aria-hidden="true" >\
	<div class="modal-header">\
		<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>\
		<h3 id="dataAlertLabel">\
			Notification\
		</h3>\
	</div>\
	<div class="modal-body">\
		<div class="form-horizontal">\
			<div class="control-group">\
				<label class="control-label">Query:</label>\
				<div class="controls">\
					<input type="text" id="_percolator-queryorg" value="'+options.query+'" disabled>\
				</div>\
			</div>\
			<div class="control-group">\
				<label class="control-label">Name:</label>\
				<div class="controls">\
					<input type="text" id="_percolator-name">\
				</div>\
			</div>\
			<div class="control-group">\
				<label class="control-label">Email:</label>\
				<div class="controls">\
					<input type="text" id="_percolator-email">\
				</div>\
			</div>\
			<div class="control-group">\
				<label class="control-label">Frequency:</label>\
				<div class="controls">\
					<select id="_percolator-frequency">\
						<option>EACH</option>\
						<option>DAILY</option>\
						<option>WEEKLY</option>\
						<option>MONTHLY</option>\
					</select>\
				</div>\
			</div>\
			<div class="control-group" style="display:none">\
				<label class="control-label">Docs per mail:</label>\
				<div class="controls">\
					<select id="_percolator-docspermail">\
						<option>10</option>\
						<option>25</option>\
						<option>50</option>\
						<option>100</option>\
					</select>\
				</div>\
			</div>\
		</div>\
	</div>\
	<div class="modal-footer">\
		<button class="btn ' + btnClass + '" data-dismiss="modal" aria-hidden="true" id="dataAlertTempOK" style="display:none;">Ok</button>\
		<button class="btn ' + btnClass + '" id="dataAlertOK">Ok</button>\
	</div>\
</div>');
		}
			$('#_percolator-queryorg').val(options.query);
			$('#dataAlertModal #dataAlertLabel').text(heading);
			
					$('html,body').animate({
		        scrollTop: $("#facetview-searchbar").offset().top},
		        'slow');
			$('#dataAlertModal').modal({
				show : true
			});
			$('#dataAlertOK').click(function(){
				percolate($('#_percolator-name').val(),$('#_percolator-email').val(),$('#_percolator-frequency').children("option").filter(":selected").val(),$('#_percolator-docspermail').children("option").filter(":selected").val());
				
				$('#dataAlertTempOK').trigger('click');
			});
	}
	
	
	var autosuggest = function(event)
	{
		event.preventDefault();
		if(autosuggestflag){
			//$('#facetview_freetext').autocomplete({
				//source : []
			//});
			autosuggestflag = false;
			$('#facetview_autosuggest_flag').attr('class','');
		}else{
			autosuggestflag = true;
			$('#facetview_autosuggest_flag').attr('class','icon-ok')
		}
		
		//if(autosuggestflag){ alert (autosuggestflag); } 
	}
	
	
    var dosearch = function() {
       
        // update the options with the latest query value from query box
        options.query = $('#facetview_freetext').val().trim(); 
		
        //setting autocomplete
		
		if( options.query ) { 
			if(autosuggestflag ){ 
				 $('#searchblox_autosuggest').show();
				var callback = function( request, response ) { 
							$.ajax({ 
								type: "get",
								url: facetview_vars.admin_url,
								data: {
										action:   'searchblox_auto_suggest',
										mydata:  "q="+options.query+"&limit="+options.nofsuggest,
										_ajax_nonce : facetview_vars._ajax_nonce
								},
								success: function( data ) {

									var temp = [];
									if(data) {

										try {
											var mydata = jQuery.parseJSON(data) ; 
											if (mydata && typeof mydata === "object" && mydata !== null) {
												for(var i in mydata){
													temp.push(mydata[i]);
												}

											}
										}
										catch (e) { console.log(e) ;  }
										var is_array = $.isArray( temp ) ; 
										if( temp.length>=1 && is_array ) { 
											temp = temp[0] ;
											response( temp );
										}  else {
											response( [] ) ; // Empty Response if There are no suggests
										}
									}
								} ,error: function(errorThrown){
										console.log(errorThrown);
									}
							}); 
					}
				$('#facetview_freetext').autocomplete({ 
					source: callback , 
					appendTo: "#searchblox_autosuggest"
				});
			}
			else{
				 $('#searchblox_autosuggest').hide();
			}
		}	
    		  	
        	
	    //refresh query
	    q=" ";
            // make the search query
	    //q="query="+encodeURI(escape(options.query));
	    q='query='+ encodeURIComponent(options.query)  ;
	    // add default params
	    q=adddefaultparams(q);
	    // add facet filter values to query
	    q=appendfilterstoquery(q);
	    // add extra filters to query
	    q=appendextrafilterstoquery(q);
	    // add size values of filter
	    q=addsizevalues(q);
	    //update sort and direction variables
	    q+=sortq;
	    q+=direction;
	    // update start page variable on new query
	    if(oldsearchquery != encodeURIComponent(options.query).trim())
	    	options.paging.from = 0;
	    // update the page variable
	    var d = parseInt(options.paging.from) == 0 ? d = 1 : d = (parseInt(options.paging.from) / parseInt(options.paging.size))+1;
	    q=q+"&page="+parseInt(d);
	    q=q+"&pagesize="+options.paging.size;
	    //update with the daterange variables
	    q+=startdate;
	    //addsizefacetsilent
	    q=adddefaultsizefacet(q);
	    //update query with size filters
	    q+=sizefilter
	    //q=trim(q);
	    
	  
	    if(q.trim() == oldquery.trim()){
	  
	    	return;
	    }
	   
	    oldquery = q.trim();
	    oldsearchquery = encodeURIComponent(options.query).trim();

	    //addlastmodifiedfacetsilent
	    q=adddefaultdatefacet(q) ; 
			
			if($('#facetview_freetext').val().trim() != ""){
				displayloader();
              
				$.getJSON(facetview_vars.search_url,"callback=?&"+q+"&" + facetview_vars.search_collection_ids ,
						function(data) {
							createCookie("searchblox_plugin_query",q,0);
							$.getJSON( facetview_vars.report_servlet,
							"callback=?&gettopclicks=yes&nodocs=5&query="+options.query,function(_data){
								data=_data.response;

								var temphtml = "<h3>Most Viewed</h3></br>";
								if(data!="nodocs"&&data!="queryerror"&&data!="")
									 for(var x in data)
											for(var y in data[x])
												temphtml += data[x][y];
									$('#facetview_leftcol_topclicks').html(temphtml);
									if(data!="nodocs"&&data!="queryerror"&&data!="")$('#facetview_leftcol_topclicks').show();
									else $('#facetview_leftcol_topclicks').hide();
							});
       
							
							showresults(data);
							
							hideloader();
				});

			}
        }
	
	     // trigger a search when a autocomplete option is selected // 
           var elem = $('#searchblox_autosuggest').children().children() ; 
	
		   $( document ).on( 'click' , elem , function() { 
			 dosearch() ;
          }) ;
	
	
	
        // trigger a search when a filter choice is clicked
        var clickfilterchoice = function(event) {
            event.preventDefault(); 
			var keyword = splitStringfromFirst($(this).attr('id'),'_')[1] ; 
			
			keyword = keyword.replace(".", " " ) ; 
			
            var newobj = '<a class="facetview_filterselected facetview_clear ' + 
                'btn btn-info" rel="' + $(this).attr("rel") + 
                '" alt="remove" title="remove"' +
                ' href="' + $(this).attr("href") + '" filtername='+keyword+' >' +
                $(this).html().replace(/\(.*\)/,'') + ' <i class="icon-remove"></i></a>';
            if($('#facetview_selectedfilters').find('a[rel='+$(this).attr("rel")+'][filtername="'+keyword+'"]').attr('filtername')==undefined){
            filterclick($(this).attr("rel"),keyword);
            $('#facetview_selectedfilters').append(newobj);
            $('.facetview_filterselected').unbind('click',clearfilter);
            $('.facetview_filterselected').bind('click',clearfilter);
            options.paging.from = 0;
            dosearch();}
            else{alert("Filter:"+$('#facetview_selectedfilters').find('a[filtername='+splitStringfromFirst($(this).attr('id'),'_')[1]+']').attr('filtername')+" already exist!!");}
        }

        var splitStringfromFirst = function(str,splitter){
        	var d = str.indexOf(splitter);
  		  	if(0>d)return str;
  		  	else{
  		  		return [str.substr(0,d) , str.substr(d+splitter.length)];
  		  	}
        }

        // clear a filter when clear button is pressed, and re-do the search
        var clearfilter = function(event) {
            event.preventDefault();
            removefilterquery($(this).attr('rel'),escape($(this).attr('filtername').replace(/%%%/g,' ')));
            $(this).remove();
            dosearch();
        }

        // do search options
        var fixmatch = function(event) {
            event.preventDefault();
            if ( $(this).attr('id') == "facetview_partial_match" ) {
                var newvals = $('#facetview_freetext').val().replace(/"/gi,'').replace(/\*/gi,'').replace(/\~/gi,'').split(' ');
                var newstring = "";
                for (item in newvals) {
                    if (newvals[item].length > 0 && newvals[item] != ' ') {
                        if (newvals[item] == 'OR' || newvals[item] == 'AND') {
                            newstring += newvals[item] + ' ';
                        } else {
                            newstring += '*' + newvals[item] + '* ';
                        }
                    }
                }
                $('#facetview_freetext').val(newstring);
            } else if ( $(this).attr('id') == "facetview_fuzzy_match" ) {
                var newvals = $('#facetview_freetext').val().replace(/"/gi,'').replace(/\*/gi,'').replace(/\~/gi,'').split(' ');
                var newstring = "";
                for (item in newvals) {
                    if (newvals[item].length > 0 && newvals[item] != ' ') {
                        if (newvals[item] == 'OR' || newvals[item] == 'AND') {
                            newstring += newvals[item] + ' ';
                        } else {
                            newstring += newvals[item] + '~ ';
                        }
                    }
                }
                $('#facetview_freetext').val(newstring);
            } else if ( $(this).attr('id') == "facetview_exact_match" ) {
            	

                var newvals = $('#facetview_freetext').val().replace(/"/gi,'').replace(/\*/gi,'').replace(/\~/gi,'').split(' ');
                var newstring = "";
                for (item in newvals) {
                    if (newvals[item].length > 0 && newvals[item] != ' ') {
                        if (newvals[item] == 'OR' || newvals[item] == 'AND') {
                            newstring += newvals[item] + ' ';
                        } else {
                            newstring += '' + newvals[item] + ' ';
                        }
                    }
                }
                $.trim(newstring,' ');
                $('#facetview_freetext').val("\"" + newstring + "\"");
            
            	
            } else if ( $(this).attr('id') == "facetview_match_all" ) {
                $('#facetview_freetext').val($.trim($('#facetview_freetext').val().replace(/ OR /gi,' ')));
                $('#facetview_freetext').val($('#facetview_freetext').val().replace(/ /gi,' AND '));
            } else if ( $(this).attr('id') == "facetview_match_any" ) {
                $('#facetview_freetext').val($.trim($('#facetview_freetext').val().replace(/ AND /gi,' ')));
                $('#facetview_freetext').val($('#facetview_freetext').val().replace(/ /gi,' OR '));
            }
			
            $('#facetview_freetext').focus().trigger('keyup');
        }


        // adjust how many results are shown
        var howmany = function(event) {
            event.preventDefault()
            var newhowmany = prompt('Currently displaying ' + options.paging.size + 
                ' results per page. How many would you like instead?')
            if (newhowmany) {
                options.paging.size = parseInt(newhowmany)
                options.paging.from = 0
                $('#facetview_howmany').html('results per page (' + options.paging.size + ')')
                dosearch();
            }
        }
        
        // adjust how many suggestions are shown
        var howmanynofsuggest = function(event) {
            event.preventDefault()
            var newhowmany = prompt('Currently displaying ' + options.nofsuggest + 
                ' suggestions per page. How many would you like instead?')
            if (newhowmany) {
                options.nofsuggest = parseInt(newhowmany)
                options.paging.from = 0
                $('#facetview_nofsuggest').html('suggestions per page (' + options.nofsuggest + ')')
                dosearch();
            }
        }
        
        var displayloader = function(){
        	var height1 = $('#facetview_results').height();
        	var width1  = $('#facetview_results').width();
        	$('.loadingbg').height(height1);
        	$('.loadingbg').width(width1);
        	$('#loading').show();
        	
        }
        
        var hideloader = function(){
        	$('#loading').hide();
        }

        
        // the facet view object to be appended to the page
        var thefacetview = ' \
           <div  id="facetview"> \
		<div class="row-fluid btn-toolbar" style="margin-bottom:10px;" id="facetview_sortbtns">\
 		<div id="sort_btn_aligner" style="display:none;">\
            <div class="btn-group">\
        	<div class="btn btn-warning disabled">Sort By : </div>\
        	<div class="btn btn-primary" id="sort_date">Date</div>\
        	<div class="btn btn-primary" id="sort_alpha">Alphabetic</div>\
        	<div class="btn btn-primary" id="sort_relevance" disabled="true">Relevance</div>\
        	<div class="btn btn-info" id="direction" dir="desc">\
				<i class="icon-arrow-down"></i>\
        	</div>\
        	</div>\
		</div>\
		</div>\
             <div class="row-fluid"> \
        	   <div class="span3"> \
                <div class="well" id="facetview_leftcol" style="display:none;width:100%;float:left"> \
         		 <div id="nofresults" style="margin-bottom:-34px;"></div>\
                  <div id="facetview_filters"></div>\
        	 	 	 <div id="adv_filters"></div>\
                </div> \
               </div> \
                <div class="span8" id="facetview_rightcol" align="left" style="margin-left: 7%;"> \
                   <div id="facetview-searchbar" style="display:inline; float:left; width:100%; margin-left:0; " class="input-prepend input-append">\
                   		<div class="add-on" style="-moz-border-radius:3px 0px 0px 3px; \
    					-webkit-border-radius:3px 0px 0px 3px; border-radius:3px 0px 0px 3px; height:100%;"><i class="icon-search"></i></div>\
                           <input id="facetview_freetext" name="query" value="" placeholder="search term" style="" autofocus autocomplete="off"/>\
                              <div id="searchblox_autosuggest"></div>\
                   		<div style="display:inline; float:left; margin-left:-2px;" class="btn-group">\
                    		<a style="-moz-border-radius:0px 3px 3px 0px; \
                    		-webkit-border-radius:0px 3px 3px 0px; border-radius:0px 3px 3px 0px" \
                    	 	 class="btn dropdown-toggle" data-toggle="dropdown" href="#"> \
                    	 	 <i class="icon-cog"></i> <span class="caret"></span></a> \
                    		<ul style="margin-left:-110px;" class="dropdown-menu"> \
                    		<li><a id="facetview_partial_match" href="">partial match</a></li> \
                    		<li><a id="facetview_exact_match" href="">exact match</a></li> \
                    		<li><a id="facetview_fuzzy_match" href="">fuzzy match</a></li> \
                    		<li><a id="facetview_match_all" href="">match all</a></li> \
         					<li class="divider"></li> \
     						<li><a id="facetview_autosuggest" href=""><i id="facetview_autosuggest_flag" class="icon-ok"></i>&nbspAutosuggest</a></li> \
                    		<li class="divider"></li> \
                    		<li><a target="_blank" \
                    		href="http://www.searchblox.com/"> \
                    		learn more</a></li> \
                    		<li class="divider"></li> \
                    		<li><a id="facetview_howmany" href="#">results per page ({{HOW_MANY}})</a></li> \
     						<li><a id="facetview_nofsuggest" href="#">suggestions per page ({{HOW_MANY_nofsuggest}})</a></li> \
                    		</ul> \
			 			</div> \
					</div>\
                   <div style="clear:both;" id="facetview_selectedfilters"></div> \
      	  			<div><div id="suggest"></div>\
                  <div><div id="ads"></div>\
         	<div id="loading" style="display:none;"> \
         	<div class="" style="position: relative; z-index: 1000;background-color: black; opacity: 0.2; ">\
         	</div>\
         	<img src="'+ facetview_vars.plugin_path +'/assets/images/loading.gif" style="position: absolute;top:30%;left:49%;z-index: 1000;"/>\
         	</div>\
                 <table class="table table-striped" id="facetview_results"></table> \
                 <div class="row-fluid" style="float:center; margin:0;" id="facetview_metadata"></div> \
         	</div> \
                </div> \
              </div> \
            </div> \
            ';

        var attrsetter = function(attrname)
        {
            var attrs=['sort_date','sort_alpha','sort_relevance'];
            for(var a in attrs)
            {
        	if(attrs[a]==attrname){
        	    $('#'+attrs[a]).attr('disabled','true');
        	    continue;
        	}
        	$('#'+attrs[a]).removeAttr('disabled');
            }
        }
        
	var sorter = function()
	{
	    	attrsetter($(this).attr('id'));
		if($(this).attr('id')=='sort_date')
		{
			sortq="&sort=date";
		}
		else if($(this).attr('id')=='sort_alpha')
		{
			sortq="&sort=alpha";
		}
		else if($(this).attr('id')=='sort_relevance')
		{
			sortq="&sort=relevance";
		}
		dosearch();
	}

	var director = function()
	{
		if($(this).attr('dir')=="desc")
		{
			$(this).attr('dir','asc');
			$('i',this).attr('class','icon-arrow-up');
			direction="&sortdir=asc";
		}
		else if($(this).attr('dir')=="asc")
		{
			$(this).attr('dir','desc');
			$('i',this).attr('class','icon-arrow-down');
			direction="&sortdir=desc";
		}
		dosearch();
	}
	

	var fixadvfiltercount = function()
	{
        $('[id^="optionsizefrom_"]').each(function(){
        	var n = findfilterindata("size");
        	$(this).html($(this).html().replace(/[(]+\w+[)]/,"("+options.data["facets"][n]["size"][1][$(this).attr('id').split('_')[1]]['#text']+")"));
        });
        $('[id^="optiondatefrom_"]').each(function(){
        	var n = findfilterindata("lastmodified");
        	if($(this).html()!='Custom')
        	$(this).html($(this).html().replace(/[(]+\w+[)]/,"("+options.data["facets"][n]["lastmodified"][1][$(this).attr('sn')]['#text']+")"));
        	
        });
	}
	
	
        // what to do when ready to go
        var whenready = function() {
            // append the facetview object to this object
            thefacetview = thefacetview.replace(/{{HOW_MANY}}/gi,options.paging.size);
            thefacetview = thefacetview.replace(/{{HOW_MANY_nofsuggest}}/gi,options.nofsuggest);
            $(obj).append(thefacetview);
            
            
            
            // setup search option triggers
            $('#facetview_partial_match').bind('click',fixmatch)
            $('#facetview_exact_match').bind('click',fixmatch)
            $('#facetview_fuzzy_match').bind('click',fixmatch)
            $('#facetview_match_any').bind('click',fixmatch)
            $('#facetview_match_all').bind('click',fixmatch)
            $('#facetview_howmany').bind('click',howmany)
            $('#facetview_nofsuggest').bind('click',howmanynofsuggest)
            $('#sort_date').bind('click',sorter);
            $('#sort_alpha').bind('click',sorter);
            $('#sort_relevance').bind('click',sorter);
            $('#direction').bind('click',director);
            $('#facetview_autosuggest').bind('click', autosuggest)
            
            // resize the searchbar
            var thewidth = $('#facetview_searchbar').parent().width()
            
            //set default size values
            for(var i in options.facets)
        	if(options.facets[i]['size'])sizeq[options.facets[i]['field']]=options.facets[i]['size'];
        	else{
        	    options.facets[i]['size']=10;
        	    sizeq[options.facets[i]['field']]=options.facets[i]['size'];
        	}
            // check paging info is available
            !options.paging.size ? options.paging.size = 10 : ""
            !options.paging.from ? options.paging.from = 0 : ""

            // append the filters to the facetview object
            buildfilters();
            //build advanced filters
            fixadvfilters();
            // set any default search values into the search bar
            if($('#facetview_freetext').val() == "" && options.query != "")
            {
            	$('#sort_btn_aligner').show('slow');
        		$('#facetview_leftcol').show('slow');
        		$('#facetview-searchbar').attr('style','display:inline; float:left; width:100%;');
        		$('.header').attr('style','padding:5px;margin-top:15px;');
            	$('#facetview_freetext').val(options.query);
               	dosearch(); 
            }
			
            $('#facetview_freetext',obj).bindWithDelay('keyup',dosearch,options.freetext_submit_delay);
           
            if((readCookie("searchblox_plugin_query")=="new" || readCookie("searchblox_plugin_query")==null) && (readCookie("searchblox_click")=="false" || readCookie("searchblox_click")==null))
            	createCookie("searchblox_plugin_query","new",0);
            else if(readCookie("searchblox_click")=="false" && readCookie("searchblox_plugin_query")!="new")
            {
            	createCookie("searchblox_plugin_query","new",0);
            }
            else
            	$.getJSON(facetview_vars.search_url,"callback=?&"+readCookie("searchblox_plugin_query"),
    	    			function(data) {
            				createCookie("searchblox_click","false",0);
            				var temp = readCookie("searchblox_plugin_query");
            				temp=temp.split('&')[0].split('=')[1];
            				options.query=temp;
            				temp=readCookie("searchblox_plugin_query");
            				temp=temp.match(/f\.[a-zA-z0-9 ]+\.filter=[\w\d\s\-\[\:\*\]]+/g);
            				
            				$('#facetview_freetext').val(unescape(options.query));
            				
    	    				showresults(data)
    	    				for(var t in temp){
            					var facetname=temp[t].split('.')[1];
            					var filtername=temp[t].split('=')[1];
            					
            					$('[id=fltchoice_'+escape(filtername.replace(' ','.'))+'][rel='+facetname+']').click();
            					
            				}
            	});
            
        }

        // ===============================================
        // now create the plugin on the page
        return this.each(function() {
            // get this object
            obj = $(this);
            
            whenready();


        }); // end of the function  

    };
	
    // facetview options are declared as a function so that they can be retrieved
    // externally (which allows for sseaving them remotely etc)
    $.fn.facetview.options = {}
	
}(jQuery));