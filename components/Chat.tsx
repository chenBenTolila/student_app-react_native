import { FC, useState } from "react";

import React from "react";
import PostModel, { NewPost, Post } from "../model/PostModel";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  FlatList,
  TouchableHighlight,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import Client, { Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Message } from "../model/ChatModel";
import * as io from "socket.io-client";
import UserModel from "../model/UserModel";

let currentUserId: String | null;
let socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;

const ListItem: FC<{
  sender: String;
  message: String;
  image: String;
  senderId: String;
}> = ({ sender, message, image, senderId }) => {
  //TODO - fix style of the first View
  console.log("image!!!!!!!!!!!!!!!!!!!!!!!!!!!!!: ");
  console.log(image);
  return (
    <TouchableHighlight underlayColor={"gainsboro"}>
      <View
        style={{
          margin: 10,
          flex: 1,
          elevation: 1,
          borderRadius: 3,
          backgroundColor: senderId == currentUserId ? "green" : "grey",
          marginRight: senderId == currentUserId ? 0 : 20,
          marginLeft: senderId == currentUserId ? 20 : 0,
        }}
      >
        <Text style={styles.userName}>{sender}</Text>

        <View style={styles.listRow}>
          {image == "" && (
            <Image
              style={styles.userImage}
              source={require("../assets/avatar.png")}
            />
          )}
          {image != "" && (
            <Image
              style={styles.userImage}
              source={{ uri: image.toString() }}
            />
          )}
          <Text style={styles.messageText}>{message}</Text>
        </View>
      </View>
    </TouchableHighlight>
  );
};

const Chat: FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const [messages, setMessages] = useState<Array<Message>>();
  const [newMessage, setNewMessage] = useState("");

  const clientSocketConnect = (
    clientSocket: Socket<DefaultEventsMap, DefaultEventsMap>
  ): Promise<string> => {
    return new Promise((resolve) => {
      clientSocket.on("connect", () => {
        resolve("1");
      });
    });
  };

  const connectUser = async () => {
    const token = await AsyncStorage.getItem("accessToken");
    console.log("my token");
    console.log(token);
    //פתיחת סוקט ללקוח
    socket = Client("http://192.168.1.103:3000", {
      auth: {
        token: "barrer " + token,
      },
    });
    console.log("before connection");
    await clientSocketConnect(socket);
    console.log("after connection");
    return socket;
  };

  const sendMessage = () => {
    console.log("***********sendMessage**********************");
    console.log(socket);

    if (socket != undefined) {
      // socket.once("chat:message", (arg) => {
      //     console.log("new message id === " + arg.res.body._id); // message id
      //     fetchMessages(socket);
      //     setNewMessage("");
      // });
      console.log("test chat send message");

      socket.emit("chat:send_message", {
        message: newMessage,
      });
    }
  };

  const addUsernameToMessages = async (res: any) => {
    let messages = Array<Message>();
    console.log(res);
    if (res) {
      for (let i = 0; i < res.length; ++i) {
        const response: any = await UserModel.getUserById(res[i].sender);
        const user: any = response.data;
        console.log("user---");
        console.log(user);
        console.log("user name - " + user.name);
        console.log("user image: " + user.imageUrl);
        const mes: Message = {
          senderId: res[i].sender,
          sender: user.name,
          message: res[i].message,
          image: user.imageUrl,
          messageId: res[i]._id,
        };
        messages.push(mes);
      }
    }
    return messages;
  };

  const fetchMessages = (socket: any) => {
    socket.once("chat:get_all.response", async (arg: any) => {
      //TODO - set list
      console.log("list of messages");
      console.log(arg.body);
      setMessages(await addUsernameToMessages(arg.body));
      console.log(messages);
    });
    console.log("test chat get all messages");
    console.log(socket.id);
    socket.emit("chat:get_all");
  };

  const updateUserId = async () => {
    currentUserId = await AsyncStorage.getItem("userId");
    console.log(currentUserId);
  };

  React.useEffect(() => {
    updateUserId();
    const subscribe = navigation.addListener("focus", async () => {
      console.log("focus");
      socket = await connectUser();
      //Register to each time that essage sent in the room
      socket.on("chat:message", (arg) => {
        console.log("new message id === " + arg.res.body._id); // message id
        fetchMessages(socket);
        setNewMessage("");
      });
      if (socket != undefined) {
        fetchMessages(socket);
      }
    });

    const unsubscribe = navigation.addListener("blur", () => {
      console.log("unfocus");
      if (socket != undefined) socket.close();
    });

    return subscribe;
  }, [navigation, socket]);

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.flatlist}
        data={messages}
        keyExtractor={(message) => message.messageId.toString()}
        renderItem={({ item }) => (
          <ListItem
            sender={item.sender}
            message={item.message}
            image={item.image}
            senderId={item.senderId}
          />
        )}
      ></FlatList>
      <View style={styles.listRow}>
        <TextInput
          style={styles.input}
          onChangeText={setNewMessage}
          placeholder="new message"
          value={newMessage}
        />
        <TouchableOpacity onPress={sendMessage}>
          <Ionicons name={"send"} style={styles.button} size={40}></Ionicons>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: StatusBar.currentHeight,
    flex: 1,
  },
  listRow: {
    flexDirection: "row",
  },
  userImage: {
    margin: 10,
    resizeMode: "contain",
    height: 50,
    width: 50,
    borderRadius: 30,
  },
  userName: {
    fontSize: 15,
    marginTop: 10,
    marginLeft: 10,
  },
  messageText: {
    fontSize: 25,
    marginTop: 10,
  },

  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    flex: 1,
  },
  button: {
    flex: 10,
    margin: 12,

    // width: 5,
    // height: 5,
  },
  flatlist: {
    flex: 1,
    marginTop: StatusBar.currentHeight,
  },
});

export default Chat;