import React, { useContext, useEffect } from 'react';

import { BackContext } from '../Context/BackState';

export default function Home() {

    const { mode, values, setvalues, voices , selectedVoice , setselectedVoice , playing, speak} = useContext(BackContext);

    useEffect(() => {
        localStorage.setItem("rate" , values.rate);
        localStorage.setItem("pitch" , values.pitch);
    }, [values.rate , values.pitch])

    const ChangeValues = (e) => {
        setvalues({ ...values, [e.target.name]: e.target.value });
    };

    const rangeSelectedText = () => {
        let textComponent = document.getElementById('exampleFormControlTextarea1');
        let selectedText;
      
        if (textComponent.selectionStart !== undefined)
        {// Standards Compliant Version
          let startPos = textComponent.selectionStart;
          let endPos = textComponent.selectionEnd;
          selectedText = textComponent.value.substring(startPos, endPos);
        }
        else if (document.selection !== undefined)
        {// IE Version
          textComponent.focus();
          let sel = document.selection.createRange();
          selectedText = sel.text;
        }
      
        return selectedText;
      };


    return (
        <div className='container' >
            <div className="mb-3">
                <form>
                    <div className="form-group my-3">
                        <label htmlFor="exampleFormControlTextarea1" style={{ "marginTop": "50px", "color": mode === "light" ? "" : "#dee4ce" }} className="form-label fontMain">Enter Your Text &nbsp; <i className={`fas fa-${playing === true ? "pause" : "play"}`} onClick={() => {
                            if (rangeSelectedText()){
                                speak(rangeSelectedText())
                            }else{
                                speak(values.text);
                            }
                            
                        }} ></i></label>
                        <textarea className="form-control" id="exampleFormControlTextarea1" style={{ "backgroundColor": mode === "light" ? "" : "#667574", "color": mode === "light" ? "" : "white" }} rows="6" value={values.text} name='text' onChange={ChangeValues}></textarea>
                    </div>

                    <div className="form-group my-3">
                        <label htmlFor="customRange1" style={{ "color": mode === "light" ? "" : "#dee4ce" }} className="form-label fontMain">Rate&nbsp; <b>{values.rate}</b></label>
                        <input type="range" className="form-range" id="customRange1" min={0.5} max={2} step={0.1} value={values.rate} name='rate' onChange={ChangeValues} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="customRange2" style={{ "color": mode === "light" ? "" : "#dee4ce" }} className="form-label fontMain">Pitch &nbsp;<b>{values.pitch}</b></label>
                        <input type="range" className="form-range" id="customRange2" min={0} max={2} step={0.1} value={values.pitch} name='pitch' onChange={ChangeValues} />
                    </div>

                    <div className="input-group my-3">
                        <button className="btn btn-outline-secondary dropdown-toggle fontMain" type="button" data-bs-toggle="dropdown" aria-expanded="false">Voices</button>
                        <ul className="dropdown-menu" style={{ "backgroundColor": mode === "light" ? "" : "#667574"}} >
                        {
                            voices.map(voice => {
                                return (
                                    <li className="dropdown-item noteItem" key={voice.name} style={{ "color": mode === "light" ? "" : "#32383e" }} onClick={() => {
                                        setselectedVoice(voice.name);
                                    }}>
                                        {voice.name}
                                    </li>
                                )
                            }
                            )
                        }
                        </ul>
                        <input type="text" style={{ "backgroundColor": mode === "light" ? "" : "#667574", "color": mode === "light" ? "" : "white" }} className="form-control" aria-label="Text input with dropdown button" value={selectedVoice} disabled={true}/>
                    </div>
                    <div className='container'>
                        <button type="button" className="btn btn-outline-primary" title={`${playing !== true ? "Play Note" : "Stop Playing"}`} ><i className={`fas fa-${playing === true ? "pause" : "play"}`} onClick={() => {
                            if (rangeSelectedText()){
                                speak(rangeSelectedText());
                            }else{
                                speak(values.text);
                            }
                        }} ></i>&nbsp;{playing !== true ?"Play":"Pause"}</button>
                    </div>

                </form>
            </div>
        </div>
    )
}
