<?php 

    $nonce = wp_create_nonce( 'searchblox-ajax-nonce' );
	$allowed_post_types = array( 'post', 'page' ); 
	$total_posts = 0;
	$total_posts_in_trash = 0;
	foreach( $allowed_post_types as $type ) {
		$type_count = wp_count_posts($type);
		foreach( $type_count as $status => $count) {
			if( 'publish' == $status ) {
				$total_posts += $count;
			} else {
				$total_posts_in_trash += $count;
			}
		}
	}
?>

<div class="wrap">
    <?php 
		searchblox_admin_header() ;  // Get Sb Admin Header 
	?> 
	<table class="widefat" style="width: 650px;">
		<thead>
			<tr>
				<th class="row-title" colspan="2">SearchBlox Plugin Settings </th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>API Key:</td>
				<td><?php echo get_option( 'searchblox_apikey' ); ?></td>
			</tr>
			<tr>
				<td>Search Collection:</td>
				<td><?php echo get_option( 'searchblox_collection' );  ?></td>
			</tr>
			<tr>
				<td>Number of Searchable Posts:</td>
				<td><span id="num_indexed_documents"></span></td>
			</tr>
		</tbody>
	</table>
	<br/>

	       <div id="msg">
		 <p>
			<b>Important:</b> Before your site is searchable, you need to synchronize your posts. Click the 'synchronize' button below to begin the process.
		 </p>
               </div> 
         
			  <div class="error" style="display:none;">
				  <p id="error-text" > There is an error while indexing documents : <b></b></p>
			  </div>
		 
	
	<div id="synchronizing">
		<a href="#" id="index_posts_button" class="gray-button">Synchronize With SearchBlox</a>
		<div class="searchblox" id="progress_bar" style="display: none;">
			<div class="progress">
				<div class="bar" style="display: none;"></div>
			</div>
		</div>
	</div>
    <br />
	<hr/>
	<p>
		If you're having trouble with the indexing your site, or would like to reconfigure your search collection,<br/>
		you may clear your Configuration by clicking the button below. This will allow you to re-configure your SearchBlox plugin.
	</p>
	<form name="re_configure_form" method="post" >
		<?php wp_nonce_field('searchblox_nonce','searchblox_nonce_field'); ?>
	    <input type="submit" name="submit_re_configure" value="Clear Configuration"  class="button-primary" />
	</form>

</div>
		
	<script>
	jQuery('#index_posts_button').click(function() {
		index_batch_of_posts(0);
	}); 
    
	var batch_size = 3;

	var total_posts_written = 0;
	var total_posts_processed = 0;
	var total_posts = <?php print( $total_posts ) ?>;
	var index_batch_of_posts = function(start) {
		set_progress();
		var offset = start || 0;
		var data = { action: 'index_batch_of_posts', offset: offset, batch_size: batch_size, _ajax_nonce: '<?php echo $nonce ?>' };
		jQuery.ajax({
				url: ajaxurl,
				data: data,
				dataType: 'json',
				type: 'GET',
				success: function(response, textStatus) {
					
					if(response['error']) {
						show_error(response['error']) ;
					}	
					
					var increment = response['num_written'];
                    if (increment) {
						total_posts_written += increment;
					}
					total_posts_processed += batch_size;
					if (response['total'] > 0) {

						index_batch_of_posts(offset + batch_size);

					} else {
						//total_posts_processed = total_posts;
						total_posts_processed = total_posts_written ; 
						set_progress();
					}
					
				},
				error: function(jqXHR, textStatus, errorThrown) {
					try {
						errorMsg = JSON.parse(jqXHR.responseText).message;
					} catch (e) {
						errorMsg = jqXHR.responseText;
						show_error(errorMsg);
					}
				}
			}
		);
	};
        
		function show_error(message) {
			jQuery('#synchronizing').fadeOut();
			jQuery('#synchronize_error').fadeIn();
			jQuery("#msg").remove();		 
			if(message.length > 0) {
				jQuery('#error-text').append(message);
				jQuery('.error').show();
			}
		}

		function set_progress() {
			var total_ops = total_posts ;
			var progress = total_posts_processed;
			if(progress > total_ops) { progress = total_ops; }
			var progress_width = Math.round(progress / total_ops * 245);
			if(progress_width < 10) { progress_width = 10; }
			if(progress == 0) {
				jQuery('#progress_bar').fadeIn();
			}

			if(progress >= total_ops) {
				jQuery('#index_posts_button').html('Indexing Complete!');
				jQuery('#progress_bar').fadeOut();
				jQuery('#index_posts_button').unbind();
				jQuery('#msg').remove();
			} else {
				jQuery('#index_posts_button').html('Indexing progress... ' + Math.round(progress / total_ops * 100) + '%');
			}
			jQuery('#num_indexed_documents').html( progress);
			jQuery('#progress_bar').find('div.bar').show().width(progress_width);

		}
</script>