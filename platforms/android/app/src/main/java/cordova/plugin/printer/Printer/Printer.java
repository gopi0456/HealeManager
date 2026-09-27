package cordova.plugin.printer;

import org.apache.cordova.*;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.os.Build;
import android.graphics.Typeface;
import android.content.Context;
import com.imin.printerlib.IminPrintUtils;
import java.io.UnsupportedEncodingException;

/**
 * This class echoes a string called from JavaScript.
 */
public class Printer extends CordovaPlugin {
    private final IminPrintUtils.PrintConnectType connectType = IminPrintUtils.PrintConnectType.USB;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("mainBill")) {
            try {
                JSONObject orderDetails = args.getJSONObject(0);
                JSONArray itemDetails = args.getJSONArray(1);
                JSONArray taxDetails = args.getJSONArray(2);
                this.mainBill(orderDetails, itemDetails, taxDetails, callbackContext);
            } catch (Exception e) {
                return false;
            }
            return true;
        } else if (action.equals("sendKot")) {
            try {
                JSONObject orderDetails = args.getJSONObject(0);
                JSONArray itemDetails = args.getJSONArray(1);
                this.sendKot(orderDetails, itemDetails, callbackContext);
            } catch (Exception exception) {
                return false;
            }

            return true;
        }
        return false;
    }

    private void mainBill(JSONObject orderDetails, JSONArray itemDetails, JSONArray taxDetails,
            CallbackContext callbackContext) throws UnsupportedEncodingException {

        try {
            Context context = this.cordova.getActivity().getApplicationContext();
            IminPrintUtils.getInstance(context).initPrinter(connectType);
            int status = IminPrintUtils.getInstance(context).getPrinterStatus(connectType);
            IminPrintUtils mIminPrintUtils = IminPrintUtils.getInstance(context);
            IminPrintUtils line = IminPrintUtils.getInstance(context);
            mIminPrintUtils.setTextSize(48);
            mIminPrintUtils.setAlignment(1);
            mIminPrintUtils.setTextStyle(1);
            mIminPrintUtils.setTextTypeface(Typeface.SANS_SERIF);
            mIminPrintUtils.printText(orderDetails.get("restname") + "-" + orderDetails.get("branchname") + "\n");
            mIminPrintUtils.setTextSize(28);
            mIminPrintUtils.printText(orderDetails.get("address") + "\n");
            if (!orderDetails.get("mobile").toString().trim().isEmpty()) {
                mIminPrintUtils.printText("Phone No:" + orderDetails.get("mobile") + "\n");
            }
            if (!orderDetails.get("gstaxno").toString().trim().isEmpty()) {
                mIminPrintUtils.printText("GSTIN:" + orderDetails.get("gstaxno") + "   \n");
            }
            if (!orderDetails.get("fssaino").toString().trim().isEmpty()
                    && !orderDetails.get("fssaino").toString().equalsIgnoreCase("0")) {
                mIminPrintUtils.printText("FSSAI CODE:" + orderDetails.get("fssaino") + "   \n");
            }
            mIminPrintUtils.setTextSize(36);
            mIminPrintUtils.setTextStyle(1);
            if (orderDetails.get("billtype").toString().equalsIgnoreCase("I")) {
                mIminPrintUtils.printText("Complimentary Bill" + "   \n");
            }
            if (orderDetails.get("reprint").toString().equalsIgnoreCase("Y")) {
                mIminPrintUtils.printText("Duplicate Bill" + "   \n");
            }
            mIminPrintUtils.printText("Bill NO:" + orderDetails.get("billno") + "   \n");
            if (!orderDetails.get("ordertype").toString().equalsIgnoreCase("E")) {
                mIminPrintUtils.printText("Token NO -" + orderDetails.get("tokenno") + "   \n");
            }
            if (orderDetails.get("ordertype").toString().equalsIgnoreCase("E")) {
                mIminPrintUtils.printText("Table NO -" + orderDetails.get("tableno") + "   \n");
            }
            mIminPrintUtils.setTextSize(30);
            mIminPrintUtils.printText(orderDetails.get("floorname") + "   \n");
            mIminPrintUtils.setTextSize(28);
            mIminPrintUtils.setAlignment(0);
            if (!orderDetails.get("agentname").toString().trim().isEmpty()) {
                mIminPrintUtils.printText("OnlineRef:" + orderDetails.get("agentname") + "   \n");
            }
            if (!orderDetails.get("channelid").toString().trim().isEmpty()) {
                mIminPrintUtils.printText("Channel ID:" + orderDetails.get("channelid") + "   \n");
            }
            mIminPrintUtils.printText("Cashier:" + orderDetails.get("cashier") + "   \n");
            mIminPrintUtils.printText("Date:" + orderDetails.get("closeTime") + "   \n");
            mIminPrintUtils.printText("Bill Date:" + orderDetails.get("billedtime") + "   \n");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                mIminPrintUtils.setTextSize(26);
                line.setTextSize(26);
                line.printText("-----------------------------------------------------------------------");
                mIminPrintUtils.printColumnsText(
                        new String[] { "ITEM NAME", "PRICE", "QTY","DISC", "SUB" },
                        new int[] { 1, 1, 1,1, 1 },
                        new int[] { 0, 2, 2, 2 ,2 }, new int[] { 26, 26, 26, 26 , 26 });
                line.printText("-----------------------------------------------------------------------");
                for (int i = 0; i < itemDetails.length(); i++) {
                    JSONObject obj = itemDetails.getJSONObject(i);
                    JSONArray modifier = new JSONArray(obj.get("modifier").toString());
                    mIminPrintUtils.printColumnsText(
                            new String[] { obj.get("name").toString(), obj.get("unitprice").toString(),
                                    obj.get("itemqty").toString(),
                                    obj.get("discamt").toString(),
                                    obj.get("itemprice").toString() },
                            new int[] { 1, 1, 1, 1,1 },
                            new int[] { 0, 2, 2,2, 2 }, new int[] { 26, 26, 26, 26,26 });
                    for (int j = 0; j < modifier.length(); j++) {
                        JSONObject modObj = modifier.getJSONObject(j);
                        mIminPrintUtils.printColumnsText(
                                new String[] { "*" + modObj.get("name").toString(), modObj.get("unitprice").toString(),
                                        modObj.get("itemqty").toString(),
                                        modObj.get("discamt").toString(),
                                        modObj.get("itemprice").toString() },
                                new int[] { 1, 1, 1, 1,1 },
                                new int[] { 0, 2, 2, 2,2 }, new int[] { 26, 26, 26, 26,26 });
                    }
                }
                line.printText("---------------------------------------------------------------");
                mIminPrintUtils.printColumnsText(
                        new String[] { "Sub Total Rs", orderDetails.get("subtotal").toString() }, new int[] { 2, 2 },
                        new int[] { 2, 2 }, new int[] { 28, 28 });
                if (!orderDetails.get("billtype").toString().equalsIgnoreCase("I")) {
                    for (int i = 0; i < taxDetails.length(); i++) {
                        JSONObject obj = taxDetails.getJSONObject(i);
                        if (!obj.get("taxamount").toString().equalsIgnoreCase("0") && !obj.get("taxamount").toString().equalsIgnoreCase("0.00")) {
                            mIminPrintUtils.printColumnsText(
                                    new String[] { obj.get("taxname") + "-" + obj.get("taxperc") + "%",
                                            obj.get("taxamount").toString() },
                                    new int[] { 2, 2 },
                                    new int[] { 2, 2 }, new int[] { 26, 26 });
                        }

                    }
                    if (!orderDetails.get("discprice").toString().equalsIgnoreCase("0") && !orderDetails.get("discprice").toString().equalsIgnoreCase("0.00")) {
                        if (!orderDetails.get("discby").toString().equalsIgnoreCase("P")) {
                            mIminPrintUtils.printColumnsText(
                                    new String[] { "Discount", orderDetails.get("discprice").toString() },
                                    new int[] { 2, 2 },
                                    new int[] { 2, 2 }, new int[] { 26, 26 });
                        } else {
                            mIminPrintUtils.printColumnsText(
                                    new String[] { "Discount - " + orderDetails.get("discper").toString() + "%",
                                            orderDetails.get("discprice").toString() },
                                    new int[] { 2, 2 },
                                    new int[] { 2, 2 }, new int[] { 26, 26 });
                        }
                    }
                    if (!orderDetails.get("roundoff").toString().equalsIgnoreCase("0")) {
                        mIminPrintUtils.printColumnsText(
                                new String[] { "Round off", orderDetails.get("roundoff").toString() },
                                new int[] { 2, 2 },
                                new int[] { 2, 2 }, new int[] { 26, 26 });
                    }
                }
                line.setTextSize(26);
                line.printText("--------------------------------------------");
                if (!orderDetails.get("billtype").toString().equalsIgnoreCase("I")) {
                    mIminPrintUtils.printColumnsText(
                            new String[] { "Total Rs", orderDetails.get("totalprice").toString() },
                            new int[] { 2, 2 },
                            new int[] { 2, 2 }, new int[] { 48, 48 });
                }
                if (orderDetails.get("billtype").toString().equalsIgnoreCase("I")) {
                    mIminPrintUtils.printColumnsText(new String[] { "Total Rs", "0.00" },
                            new int[] { 2, 2 },
                            new int[] { 2, 2 }, new int[] { 48, 48 });
                }
                mIminPrintUtils.printColumnsText(
                        new String[] { "Total Items - " + orderDetails.get("total_item"),
                                "No of Quantity - " + orderDetails.get("no_of_qty") },
                        new int[] { 2, 2 }, new int[] { 0, 0 }, new int[] { 26, 26 });
                mIminPrintUtils.setTextSize(36);
                mIminPrintUtils.setAlignment(1);
                if (!orderDetails.get("settlementType").toString().trim().isEmpty()) {
                    mIminPrintUtils.printText("Settlement Type:" + orderDetails.get("settlementType") + "   \n");
                }
                line.printText("---------------------------------------------------------------");
            }
            mIminPrintUtils.setAlignment(0);
            mIminPrintUtils.setTextSize(28);
            if (!orderDetails.get("remarks").toString().trim().isEmpty()) {
                mIminPrintUtils.printText("Remarks:" + orderDetails.get("remarks") + "   \n");
            }
            if (!orderDetails.get("custname").toString().trim().isEmpty()
                    && !orderDetails.get("custname").toString().trim().isEmpty()
                    && !orderDetails.get("custname").toString().trim().isEmpty()) {
                mIminPrintUtils.printText("Name:" + orderDetails.get("custname") + "   \n");
                mIminPrintUtils.printText("Mobile No:" + orderDetails.get("custmob") + "   \n");
                mIminPrintUtils
                        .printText("Address:" + orderDetails.get("custname") + "," + orderDetails.get("custmob") + ","
                                + orderDetails.get("custaddr") + "   \n");
            }
            if (orderDetails.get("barcodeInBill").toString().equalsIgnoreCase("Y")) {
                mIminPrintUtils.printBarCode(73, "{BBILLNO" + orderDetails.get("orderid"), 1);
            }
            if (orderDetails.get("feedback").toString().trim().length() > 0) {
                mIminPrintUtils.setQrCodeSize(8);
                mIminPrintUtils.printQrCode(orderDetails.get("feedback").toString(), 1);
            }
            mIminPrintUtils.setTextSize(26);
            mIminPrintUtils.printText("Technology Partner www.foodenginepos.com" + "   \n");
            IminPrintUtils.getInstance(context).partialCut();
            callbackContext.success(status);
        } catch (Exception e) {
            callbackContext.error(e.getMessage());
        }
    }

    private void sendKot(JSONObject orderDetails, JSONArray itemDetails, CallbackContext callbackContext) {
        try {
            Context context = this.cordova.getActivity().getApplicationContext();
            IminPrintUtils.getInstance(context).initPrinter(connectType);
            int status = IminPrintUtils.getInstance(context).getPrinterStatus(connectType);
            IminPrintUtils mIminPrintUtils = IminPrintUtils.getInstance(context);
            IminPrintUtils line = IminPrintUtils.getInstance(context);
            mIminPrintUtils.setTextSize(48);
            mIminPrintUtils.setAlignment(0);
            mIminPrintUtils.setTextStyle(1);
            mIminPrintUtils.setTextTypeface(Typeface.SANS_SERIF);
            mIminPrintUtils.printText(orderDetails.get("floorname") + "   \n");
            if (orderDetails.get("cancelkot").toString().equalsIgnoreCase("Y")) {
                mIminPrintUtils.printText("Cancel KOT" + "   \n");
            }
            mIminPrintUtils.setTextSize(28);
            if (!orderDetails.get("captainname").toString().trim().isEmpty()) {
                mIminPrintUtils.printText("Captain Name:" + orderDetails.get("captainname") + "   \n");
            }
            if (!orderDetails.get("waitername").toString().trim().isEmpty()) {
                mIminPrintUtils.printText("Waiter Name:" + orderDetails.get("waitername") + "   \n");
            }
            mIminPrintUtils.printText("Order ID:" + orderDetails.get("orderid") + "   \n");
            if (!orderDetails.get("onlineref").toString().trim().isEmpty() && orderDetails.get("ordertype").toString().equalsIgnoreCase("D")) {
                mIminPrintUtils.printText("OnlineRef:" + orderDetails.get("onlineref") + "   \n");
            }
            mIminPrintUtils.printText("Bill Date:" + orderDetails.get("billdate") + "   \n");
            line.printText("-----------------------------------------------------------------------");
            mIminPrintUtils.printColumnsText(new String[] { "ITEM NAME", "QTY", "REMARKS" }, new int[] { 2, 1, 1 },
                    new int[] { 0, 2, 2 }, new int[] { 26, 26, 26 });
            line.printText("-----------------------------------------------------------------------");
            for (int i = 0; i < itemDetails.length(); i++) {
                JSONObject obj = itemDetails.getJSONObject(i);
                JSONArray modifier = new JSONArray(obj.get("modifier").toString());
                mIminPrintUtils.printColumnsText(
                        new String[] { obj.get("name").toString(), obj.get("itemqty").toString(),
                                obj.get("remarks").toString() },
                        new int[] { 2, 1, 1 },
                        new int[] { 0, 2, 2 }, new int[] { 26, 26, 26 });
                for (int j = 0; j < modifier.length(); j++) {
                    JSONObject modObj = modifier.getJSONObject(j);
                    mIminPrintUtils.printColumnsText(
                            new String[] { "*" + modObj.get("name").toString(),
                                    modObj.get("itemqty").toString(),
                                    modObj.get("remarks").toString() },
                            new int[] { 2, 1, 1 },
                            new int[] { 0, 2, 2 }, new int[] { 26, 26, 26 });
                }
            }
            line.printText("---------------------------------------------------");
            mIminPrintUtils.setTextSize(36);
            if (!orderDetails.get("ordertype").toString().equalsIgnoreCase("E")) {
                mIminPrintUtils.printText("Token NO -" + orderDetails.get("tokenno") + "   \n");
            }
            if (orderDetails.get("ordertype").toString().equalsIgnoreCase("E")) {
                mIminPrintUtils.printText("Table NO -" + orderDetails.get("tableno") + "   \n");
            }
            IminPrintUtils.getInstance(context).partialCut();
        } catch (Exception exception) {
            callbackContext.error(exception.getMessage());
        }

    }
}
