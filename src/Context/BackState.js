import React , { createContext, useState ,useEffect} from 'react';

// Createcontext
const BackContext = createContext();

const BackState = (props) => {

    // Init SpeechSynth API
    const synth = window.speechSynthesis;
    const [voices , setvoices] = useState(synth.getVoices());

    const [mode, setmode] = useState("light");
    const [playing, setplaying] = useState(false);
    const [selectedVoice , setVoice] = useState("Microsoft Zira Desktop - English (United States)");

    useEffect(() => {
        if(localStorage.getItem("mode")){
            if (localStorage.getItem("mode") !== "light"){
                setmode("dark");
                localStorage.setItem("mode" , "dark");
                document.body.style.backgroundColor = "#32383e";
            }else{
                setmode("light");
                localStorage.setItem("mode" , "light");
                document.body.style.backgroundColor = "#eef2e4";
            }
        }
        setvoices(synth.getVoices());
        setselectedVoice(localStorage.getItem("voice"));
    }, [synth])

    const ChangeMode = () => {
        if (mode === "light"){
            setmode("dark");
            localStorage.setItem("mode" , "dark");
            document.body.style.backgroundColor = "#32383e";
        }else{
            setmode("light");
            localStorage.setItem("mode" , "light");
            document.body.style.backgroundColor = "#eef2e4";
        }
    };

    const [values, setvalues] = useState({
        text: "",
        rate: localStorage.getItem("rate") ? localStorage.getItem("rate") : 1,
        pitch: localStorage.getItem("pitch") ? localStorage.getItem("pitch") : 1
    });

    const setselectedVoice = (voice) => {
        if (voice){
            setVoice(voice);
            localStorage.setItem("voice" , voice);
        }
    }

    const speak = (txt) => {
      if (synth.speaking || txt === null || txt === "") {
        // console.error('Already speaking...');
        synth.cancel();
        return;
      }
  
      // Check if speaking
      const textInput = txt;
  
  
      if (textInput !== '') {
        const speakText = new SpeechSynthesisUtterance(textInput);
        speakText.onstart = e => {
          setplaying(true);
        }
        speakText.onend = e => {
          // console.log('Done speaking...');
          setplaying(false);
        };
        speakText.onerror = e => {
          // console.error('Something went wrong');
          setplaying(false);
        };
        const selectedVoice1 = selectedVoice;
        voices.forEach(voice => {
          if (voice.name === selectedVoice1) {
            speakText.voice = voice;
          }
        });
        speakText.rate = values.rate;
        speakText.pitch = values.pitch;
        // Speak
        synth.speak(speakText);
      }
    };
    
    return (
        <BackContext.Provider value={{mode , ChangeMode , values, setvalues , playing , speak , voices , selectedVoice , setselectedVoice}}>
            {props.children}
        </BackContext.Provider>
    )
}

export default BackState;
export {
    BackContext
};