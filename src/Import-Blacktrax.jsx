CELL_NUM_FRAMES = [0,15]
CELL_DATE = [0,11]
FIRST_TRACKER_COL = 2
DATA_HEADER_ROW = 6; // The row where the header is located in the CSV file
DATA_START_ROW = 7
NUM_MARKERS_PER_TRACKER = 3;
MARKER_NAME_ROW = 3;


function main() {
    var csvFile = File.openDialog("Select a CSV file", "*.csv");
    if (csvFile) {
        parse_csv(csvFile);
    } 
}


function parse_csv(file) {

    file.open('r');
    var content = file.read();
    var rows = content.split("\n");
    //capture the date and the length of the tracking data
    var capture_infos = rows[0].split(",");
    var tracking_name = capture_infos[3];
    var capture_fps = parseFloat(capture_infos[9]);
    var capture_date = capture_infos[CELL_DATE[1]];
    var formated_date = capture_date.split(" ")[0]
    var capture_num_frames = parseInt(capture_infos[CELL_NUM_FRAMES[1]]);
    var tracking_duration = capture_num_frames / capture_fps; // Calculate the duration in seconds
    //alert("Capture Date: " + formated_date + "\nNumber of Frames: " + capture_num_frames);

    //create AE composition
    var ae_comp = create_comp(tracking_name, formated_date, capture_num_frames, capture_fps, tracking_duration);
    if(!ae_comp)
        return

    //get the markers
    var first_data_row = rows[DATA_START_ROW];
    var data_cols = first_data_row.split(",");
    var marker_cols = [];
    var markers = {}
    var marker_name_row = rows[MARKER_NAME_ROW].split(",");
    for (var i = FIRST_TRACKER_COL; i < data_cols.length; i+= NUM_MARKERS_PER_TRACKER) {
        if (data_cols[i] !== "") {
            //create array of length NUM_MARKERS_PER_TRACKER
            var cols = new Array(NUM_MARKERS_PER_TRACKER).fill(0); // Initialize an array with zeros
         
            for (var j = 0; j < NUM_MARKERS_PER_TRACKER; j++) {
                cols[j] = i + j; // Assign the column index for each marker
            }
            //create the marker object
            m_name = marker_name_row[i];
            //-check if the marker name is already in the markers object
            if (markers[m_name] === undefined) {
                //-create marker layer
                var marker_layer = ae_comp.layers.addNull(tracking_duration);
                marker_layer.label = i%16;
                marker_layer.transform.scale.setValue([1, 1]);

                marker_layer.name = m_name;

                markers[m_name] = {
                    "cols"      : cols,
                    "positions" : [],
                    "times"    : [], // This will hold the time values for each position
                    "layer"     : marker_layer
                };


            }
           
        
            
        }
    }


    ///alert(JSON.stringify(markers, null, 2));




    //go through the position data
    //var times = [];
    
    for(var i = DATA_START_ROW; i < rows.length-1; i++) {
        var row = rows[i].split(",");
        frame = parseInt(row[0]);
        time = parseFloat(row[1]);
        //times.push(time);
        for(var m in markers){
            var x_col = markers[m]["cols"][0];
            var y_col = markers[m]["cols"][1];
            var z_col = markers[m]["cols"][2];
            
            //REMAP BTX COORDS TO AE COORDS
            var x = parseFloat(row[x_col]);
            var y = parseFloat(row[z_col]);
            var z = parseFloat(row[y_col]);

            if(isNaN(x) || isNaN(y) || isNaN(z)) {
                continue;
            }
            //save the position data in the markers object at that time
            markers[m]["positions"].push([x, y, z]);
            markers[m]["times"].push(time);

            //alert("Frame: " + frame + "\nMarker: " + m + "\n X: " + x + ", Y: " + y + ", Z: " + z);
           
        }
    

    }

    //apply the markers keyframes
    for(var m in markers) {
        var marker      = markers[m];
        var layer       = marker.layer;
        var positions   = marker.positions;
        var times       = marker.times;
    
        layer.transform.position.setValuesAtTimes(times, positions);
  
    }

    file.close();

}

function create_comp(tracking_name, date, num_frames, capture_fps, duration) {
    var comp_name = date+"_"+tracking_name+"_BTX-capture";
    //check if comp item exists
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem && app.project.item(i).name === comp_name) {
            alert("Composition with name '" + comp_name + "' already exists.");
            return null;
        }
    }

    var comp_width = 100;
    var comp_height = 100;
   
    var comp = app.project.items.addComp(comp_name, comp_width, comp_height, 1.0, duration, capture_fps);
    return comp;
}

main();
