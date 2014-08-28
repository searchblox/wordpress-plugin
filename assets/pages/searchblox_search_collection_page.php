<?php 
if(isset( $_POST['submit'] ) ) { 

		wp_verify_nonce( 'searchblox_nonce' , 'searchblox_nonce_field' );
		if( ! empty ( $_POST['searchblox_check'] ) ) : 
	
			// Good idea to make sure things are set before using them
			$_POST['searchblox_check'] =  (array) $_POST['searchblox_check'] ;

			// Any of the WordPress data validation functions can be used here
			$_POST['searchblox_check'] = array_map( 'sanitize_text_field', $_POST['searchblox_check'] );
	
			update_option( 'searchblox_search_collection' , $_POST['searchblox_check'] ) ; 
		else : 
	    	update_option( 'searchblox_search_collection' , '' ) ; 
			
		endif ;
	}
?>
 <div class="wrap">
	<?php searchblox_admin_header() ; ?>
	
	<h2> SearchBlox Collection </h2>
	<h4> Mark the collections you want to show your search results from.</h4> 
	<p><b>NOTE :</b>  If not marked, it will search from all of the available collections on your server. </p>
	<hr />
  <form method="post"> 
	<table class="widefat">
    <thead>
        <tr>
			<th class = "searchblox_th" >
				<input type="checkbox" id="sb_checkall" name="checkall" 
					<?php echo $checked = isset( $_POST['checkall'] ) ? 'checked="checked"' : NULL ?>
				/>   
			</th>
            <th> 
				<span>	
				  ID
				</span>  
			</th>
            <th> 
			  Collection Name 
			</th>
        </tr>
    </thead>
	<tbody>
	
<?php  
		$count = 0;
		foreach($collections as $collection): 
?>
        <tr <?php if($count%2==0){?> class="alternate" <?php }?>>
			<th>
			<input type="checkbox" class="sb_check" name="searchblox_check[]" 
				value="<?php  echo $collection->{'@id'};  ?>"
				<?php
				if( get_option( 'searchblox_search_collection' ) ) :
				
				if( in_array( $collection->{'@id'}  , get_option( 'searchblox_search_collection') ) ) {
				echo 'checked="checked"' ; 
				}
				endif;
				?> 
				/>  
			</th>
            <td> 
			    <?php echo $collection->{'@id'} ; ?> 
			</td>
            <td> 
			  <?php echo $collection->{'@name'} ; ?>  
			</td>
        </tr>
<?php wp_nonce_field('searchblox_nonce','searchblox_nonce_field'); 
      $count++ ;  
	  endforeach;  
 ?>
	   
	</tbody>
   </table>
  <div class = "searchblox-clear"> </div>
  <input type="submit" name="submit" value="Save Settings"  class="button-primary" />
 </form>	
</div>
   
<script>
	 // Check and uncheck all 
	
	jQuery("#sb_checkall").click(function(){
		var check = jQuery("#sb_checkall").is(':checked') ; 
			if(check) 
				{
					 jQuery('.sb_check').prop('checked', true);
					
				}
				
			    else {
					
					 jQuery('.sb_check').prop('checked', false);
				}
				
			}) ; 
	
	 // Check and uncheck all 
</script>