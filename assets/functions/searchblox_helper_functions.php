<?php defined('ABSPATH') or die("Direct Access Not Allowed!");


/**
* Load Initial settings for the plugin
*
* Performs most of the Initial Work.
*/

	function searchblox_initial_settings() {

		/// ALL ACTIONS //

		add_action( 'admin_enqueue_scripts', 'searchblox_wp_admin_style' );
		add_action( 'admin_menu', 'searchblox_admin_init' );
		add_action( 'publish_post', 'searchblox_trigger_index' ); // If a post is published, index it.
		add_action( 'delete_post', 'searchblox_trigger_delete' ); // If a post is deleted, remove it from index.
		
		/// ALL ACTIONS //
		

		// Suggest apikey at the beginning or apikey entered blank
		$default_apikey = searchblox_check_apikey();
		if ( !$default_apikey ) $default_apikey = '';
		add_option( "searchblox_apikey", $default_apikey ); // Default apikey is from local machine


	  
		/// AJAX REQUESTS ACTIONS ///

		add_action( 'wp_ajax_index_batch_of_posts','searchblox_index_batch_of_posts' );
	
		/// AJAX REQUESTS ACTIONS ///
	}

/**
* Load MY Custom CSS
*
* 
*/

	function searchblox_wp_admin_style() {

		wp_register_style( 'searchblox-my-custom', PLUGIN_FULL_PATH.'assets/css/searchblox-custom.css', false );
		wp_enqueue_style(  'searchblox-my-custom' );
	}

/**
* SB Admin Header
*
* 
*/
	
	function searchblox_admin_header() { 
        
		$header = '<div class="searchblox-logo" > 
					  <h2 class="searchblox-h2">SearchBlox Search Plugin</h2> 
					</div>	
					<p>
						<b>To administer your SearchBlox Search Collection, visit the 
						<a href="'. SEARCHBLOX_LOCATION. ':' . SEARCHBLOX_PORTNO . '/searchblox/admin/main.jsp" 
						target="_blank">SearchBlox Dashboard.</a></b>
					</p>' ; 
		echo $header ; 			
					
	}


/*
 * Form Fill value
 * @param field , the Form field name
 * @param array  , Weather name of field is string or an array   
 */

	function searchblox_form_value( $field , $array = '' ) {

		if( isset($_POST) && !(empty($_POST)) ) {
			if( $array == 'true' && !(empty($_POST['sb_form'][$field] )) ){
				return esc_attr( $_POST['sb_form'][$field] ) ; 
			} elseif( isset($_POST[$field]) ) {
				return esc_attr($_POST[$field]);
			}	
		} else {
			return '';
		}

    }


/*
 * Strips tags and takes an excerpt from the content 
 * @value: Content to be excerpted
 * @length: length of the excerpt
 */
 
	function searchblox_description($value, $length=100) {
		
		$value = searchblox_sanitize ( $value );
		if(is_array($value)) { 
		list($string, $match_to) = $value;
		} else {
		$string = $value;
			if( isset($value[0]) ) {	
			$match_to = $value{0}; 
			} else {
			$mathc_to = $value ;	
			}
		}

		$match_start = @stristr($string, $match_to);
		$match_compute = strlen($string) - strlen($match_start);

		if (strlen($string) > $length)
		{
			if ($match_compute < ($length - strlen($match_to)))
			{
				$pre_string = substr($string, 0, $length);
				$pos_end = strrpos($pre_string, " ");
				if($pos_end === false) $string = $pre_string."...";
				else $string = substr($pre_string, 0, $pos_end)."...";
			}
			else if ($match_compute > (strlen($string) - ($length - strlen($match_to))))
			{
				$pre_string = substr($string, (strlen($string) - ($length - strlen($match_to))));
				$pos_start = strpos($pre_string, " ");
				$string = "...".substr($pre_string, $pos_start);
				if($pos_start === false) $string = "...".$pre_string;
				else $string = "...".substr($pre_string, $pos_start);
			}
			else
			{       
				$pre_string = substr($string, ($match_compute - round(($length / 3))), $length);
				$pos_start = strpos($pre_string, " "); $pos_end = strrpos($pre_string, " ");
				$string = "...".substr($pre_string, $pos_start, $pos_end)."...";
				if($pos_start === false && $pos_end === false) $string = "...".$pre_string."...";
				else $string = "...".substr($pre_string, $pos_start, $pos_end)."...";
			}

			$match_start = stristr($string, $match_to);
			$match_compute = strlen($string) - strlen($match_start);
		}
	   
		return $string;
	}



/*
 * Sanitizes text 
 * 
 * 
 */
function searchblox_sanitize( $text ) {
	
		if ( trim( $text ) == '' ) return $text;
		
		$text = html_entity_decode( $text, ENT_COMPAT, "UTF-8" );
		$text = preg_replace( '@<[\/\!]*?[^<>]*?>@si', ' ', $text );
		$text = str_replace( array( "&" , "   " , "  " ) , array( "and" , " " , " ") , $text );
		return $text;
		
}



/*
 * These are all admin notice messages 
 * 
 * 
 */

	function searchblox_success() {
		echo '<div class="updated fade"><p><b>[SearchBlox]</b> Action completed succesfully.</p></div>';
	}

	function searchblox_files_warning() {
		echo '<div class="updated fade"><p><b>[SearchBlox]</b> Necessary files not found.</p></div>';
	}

	function searchblox_collection_warning() {
		echo '<div class="error fade"><p><b>[SearchBlox]</b> Invalid collection name.</p></div>';
	}

	function sarchblox_not_set() {
		echo '<div class="error fade"><p><b>[SearchBlox]</b> Searchblox settings not configured .</p></div>';
	}

	function searchblox_no_collection() { 
	  echo '<div class="error fade"><p><b>[SearchBlox]</b> You have created no collections yet.</p></div>';
	}

	function searchblox_location_warning() {
		echo '<div class="error fade"><p><b>[SearchBlox]</b> Server location path cannot be empty.</p></div>';
	}

	function searchblox_simplexml_exist_warning() {
		echo '<div class="error fade"><p><b>[SearchBlox]</b> In your php configuration <b>simplexml</b> is not enabled. This plugin needs simplexml to function. Please adit your php.ini file to enable simplexml or contact your hosting provider to enable it.</p></div>';
	}

	function searchblox_apikey_warning() {
		echo '<div class="error fade"><p><b>[SearchBlox]</b> Invalid API Key.</p></div>';
	}

	function searchblox_unknown_reply() {
		echo '<div class="error fade"><p><b>[SearchBlox]</b> Unknown reply from SearchBlox server.</p></div>';
	}

	function searchblox_path_warning() {
		echo '<div class="error fade"><p><b>[SearchBlox]</b> Invalid server name OR unable to communicate with the server. Please make sure you have provided the correct Server Name and Port # </p></div>';
	}

/*
 * Changes message code to text 
 * @code: Message code coming from api
 * 
 */
 
	function searchblox_xml_message_detail($code) {
		$codes = array("100","101","200","201","301","400","401","500","501","502","503","601","700","701");
		
		$details = array("Document Indexed","Error Indexing Document","Document Deleted","Document requested for deletion does not exist",
		"Document Not Found","Collection Cleared","Error Clearing Collection","Invalid Collection Name","Invalid Request",
		"Invalid Document Location","Specified collection is not a CUSTOM collection","Invalid API key",
		"Collection Optimized","Error Optimizing Collection"
		);
		
		$code = str_replace($codes,$details,$code);
		if (trim($code) == '') return 'None';
		else return $code;
	}


/*
 * Checks the API key, return API if it exists 
 * 
 * 
 */
	function searchblox_check_apikey() {

		$apikey = trim( get_option( 'searchblox_apikey' ) );
		
		if ( $apikey <> '' ) return $apikey;
		
		// If apikey is not provided try to find it locally
		if ( PLATFORM == 'windows' ) {
			
			$config_file = SEARCHBLOX_LOCATION . "/webapps/searchblox/config.xml";
			$config_file_wamp = 'C:\Program Files\SearchBlox Server' . "\\webapps\\searchblox\\config.xml"; 
		}
		
		else $config_file = SEARCHBLOX_LOCATION . "/opt/searchblox/webapps/searchblox/config.xml";
		
		$xml = @simplexml_load_file($config_file);
		$apikey = (string) $xml['apikey'];
		
		if (trim($apikey)<>'') {
			update_option( 'searchblox_apikey', $apikey);
			return $apikey;
		}
		else {
			$xml = @simplexml_load_file($config_file_wamp);
			$apikey = (string) $xml['apikey'];
			if (trim($apikey)<>'') {
				update_option( 'searchblox_apikey', $apikey);
				return $apikey;
			}
			else return false;
		}
	}
	
/*
 * Check If settings are configured
 */
 
	function searchblox_config_check() {
	
	   if( ! SEARCHBLOX_APIKEY   ||  ! SEARCHBLOX_COLLECTION ||  ! SEARCHBLOX_LOCATION || ! SEARCHBLOX_PORTNO  ) {
          return false ; 
        } else {
		  return true ;  
		}
	}


/*
 * Simple XMl Should be enabled for this plugin 
 */

	if ( !function_exists('simplexml_load_string') OR !function_exists('simplexml_load_file') )  {
	
		add_action('admin_notices', 'searchblox_simplexml_exist_warning');
		wp_die() ;
	}

	
/*
 * Make sure we don't expose any info if called directly
 */
	 
	if ( !function_exists( 'add_action' ) ) {
		echo 'Hi there!  I\'m just a plugin, not much I can do when called directly.';
		exit;
	}


/*
 * Returns SearchBlox Admin Page url
 */

	function searchblox_url() {
		
		return get_admin_url() . '?' . $_SERVER['QUERY_STRING'] ; 
	}