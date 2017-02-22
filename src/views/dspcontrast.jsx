import {Button,ListView, Modal, Dimensions, Dialog, Picker } from 'nuke';
import {mount} from 'nuke-mounter';
import {createElement, Component} from 'weex-rx';
import QN from 'QAP-SDK';
import { View, Text, TouchableHighlight,ScrollView } from 'nuke-components';
import Async from 'async';
import _ from 'lodash';
import { getCustbaseRpt, getHistoryReport } from '../api';
import { number_format } from './util';

let URL= document.URL;
let params= QN.uri.parseQueryString(URL.split('?')[1]);
const subway_token = params.subway_token;
let {height} = Dimensions.get('window');
const user_id = params.user_id;

var ds=[{key:'pv',value:'展现量'},
        {key:'click',value:'点击量'},
        {key:'cost',value:'花费'},
        {key:'cpc',value:'平均点击花费'}
        ];
class DspcontrastView extends Component{
     constructor() {
        super();   
        this.state = {
            selectValue: 'pv',
            report:{},
            selectReport:{}
        }  

        this.formatEchartsData = this.formatEchartsData.bind(this); 
        this.selectedItem = this.selectedItem.bind(this); 
    }
   
	componentDidMount () {
		this.getReports();
	}
	getReports() {
        var self = this;
        Async.parallel({
            baserpt:function(callback){
                getCustbaseRpt (subway_token).then((result) => {
					callback(null,result);
				}, (error) => {
		            callback(error,[]);
		        })
            },
            dsprpt:function(callback){
            	 getHistoryReport(user_id).then((res) => {
            	 	var items = [];
        
                        //注：report 结果是按照日期倒叙排列的
                        if(_.keys(res.report).length >0)
                        {
                             var index =  _.findLastIndex(res.report,function(item){
                                return item.pv > 0;
                             });

                             if(index > -1)
                             {
                                var itemslist = res.report.slice(0,index+1);
                                items=  _.sortBy(itemslist,'record_on');//正
                             }
                        }
                    
                    callback(null,items);  
				}, (error) => {
		            callback(error,[]);
		        })   
            }
        },function(error,result){
            self.selectedItem();
            if(error === null){
                var obj = self.formatEchartsData(result);//正序 
                self.setState({report:obj});
                self.showTableList(self.state.selectValue);
            }else {
              
            }  
        });
    }
    formatEchartsData(report){
        var self = this;
        var date_temp = [],//日期数据
            dsp_temp = {pv:[],click:[],cost:[],cpc:[]},  // dsp数据
            ztc_temp = {pv:[],click:[],cost:[],cpc:[]}; //直通车数据
        var ztc_length = report.baserpt == undefined ? 0 :report.baserpt.length;

        report.dsprpt.map((v,i) => {
            v.clicks = parseInt(v.clicks);
            v.cost = parseInt(v.cost);
            var dateArr = v.record_on.split('-');
            date_temp.push(dateArr[1]+'-'+dateArr[2]);
            dsp_temp.pv.push((v.pv));
            dsp_temp.click.push((v.clicks));
            dsp_temp.cost.push((v.cost/100).toFixed(2));
            dsp_temp.cpc.push( (v.clicks!==0)?((v.cost/100)/v.clicks).toFixed(3):0);
            var zpv = 0,zclick= 0,zcost= 0,zcpc = 0;

            if(ztc_length >0) {
                var item =  _.find( report.baserpt,function(m){
                    return m.date.toString() === v.record_on.toString();
                });
                if(item !== undefined){
                    zpv = item.impressions ? item.impressions :0;
                    zclick = item.click ? item.click :0;
                    zcost = item.cost ? item.cost :0;
                    zcpc =  item.cpc ? parseFloat(item.cpc/100).toFixed(3) :0;
                }
            }
            ztc_temp.pv.push(zpv);
            ztc_temp.click.push(zclick);
            ztc_temp.cost.push(zcost);
            ztc_temp.cpc.push(zcpc);
        });
        return  {date_data:date_temp,dsp_data:dsp_temp,ztc_data:ztc_temp};
    }
    presshandle() {
    	var self= this;
        Picker.show({title:'请选择',dataSource:ds,selectedKey:'1',maskClosable:true},(e)=>{
	        console.log('select item ',e)
	        self.setState({
           		selectValue: e.key
           })
	       self.showTableList(e.key);
	    },(e)=>{
	        // {cancel:true}
	        self.setState({
           		selectValue: e.key
           })
	        self.showTableList(e.key);
	    },(e)=>{
	    	Modal.alert(1)
	        console.log('success rendered')
	    },(e)=>{
	        console.log('fail to render picker')
	    });
    }
    showTableList(attribute){
        var self = this;
        var dspData = self.state.report.dsp_data[attribute],
            ztcData = self.state.report.ztc_data[attribute];
        var xAxis = [],dsp = [],ztc=[];
        for(var i = self.state.report.date_data.length-1; i>=0  ;i--){
            xAxis.push(self.state.report.date_data[i]);
            dsp.push((attribute === 'pv' || attribute === 'click' ) ? number_format(dspData[i]) : dspData[i]);
            ztc.push((attribute === 'pv' || attribute === 'click' ) ? number_format(ztcData[i]) : ztcData[i]);
        }
        self.setState({selectReport:{date: xAxis,dsp: dsp,ztc: ztc}});
    }   
    selectedItem(){
        var self = this,item = '';
        ds.map((item,index)=>{
            if(item.key == self.state.selectValue){
                item = item.value;
              
            }
        })
console.log(item,'333');
        return item;
    }
	render () {
		var self = this;
        console.log(JSON.stringify(self.state.selectReport));
		return (
			<ScrollView style={styles.scroller}>
				<View style={styles.amoutList}>
					<Text style={styles.amoutTextList}>当前数据</Text>
					<Button onPress={this.presshandle.bind(this)} style={{flex: 5}} type="secondary">
						{/*self.selectedItem.bind(this)*/}
					</Button>
				</View>
				<View style={styles.amoutList}>
					<Text style={styles.textStyle}>日期</Text>
					<Text style={styles.textStyle}>淘外引流</Text>
					<Text style={styles.textStyle}>直通车</Text>
				</View>
				<View>
					{
						/*self.state.selectReport
						? self.state.selectReport.date.map((item,i) => {
							return (
                                <View style={styles.amoutList}>
    								<Text style={styles.comStyle}>{item}</Text>
                                    <Text style={styles.comStyle}>{self.state.selectReport.dsp[i] ? self.state.selectReport.dsp[i]:0 }</Text>
                                    <Text style={styles.comStyle}>{self.state.selectReport.ztc[i] ? self.state.selectReport.ztc[i]:0 }</Text>
                                </View>
							)
						})
                        :
                        <Text>Loading...</Text>*/
					}
				</View>
			</ScrollView>
		)
	}
}

const styles={
	scroller:{
          width: 750,
          height: height-10,
          flex: 1
       },
	amoutList: {
        backgroundColor: "#ffffff",
       	padding: '30rem',
        borderBottomWidth: "2rem",
        borderBottomStyle: "solid",
        borderBottomColor: "#e8e8e8",
        paddingTop: "40rem",
        alignItems: "center",
        flexDirection: "row",
        display: 'flex'
    },
    cellList: {
        backgroundColor: "#ffffff",
       	padding: '30rem',
        borderBottomWidth: "2rem",
        borderBottomStyle: "solid",
        borderBottomColor: "#e8e8e8",
        paddingTop: "40rem",
        alignItems: "center",
        flexDirection: "row",
        display: 'flex'
    },
    amoutTextList: {
        fontSize: "32rem",
        color: "#5F646E",
        flex: 11

    },
    textStyle: {
    	flex: 7,
    	fontSize: '30rem',
    	textAlign: 'center'
    },
    comStyle: {
    	flex: 4,
    	fontSize: '30rem',
    	textAlign: 'center'
    }
}



mount(<DspcontrastView />, 'body')
