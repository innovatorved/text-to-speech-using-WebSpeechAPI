import React ,{useContext} from 'react';
import { Link } from "react-router-dom";

import { BackContext } from '../Context/BackState';

// Import Image
import t2s from './text-to-speech(1).png';

export default function Navbar() {
    const { mode, ChangeMode} = useContext(BackContext);    
    
    return (
        <div className="fontMain">
            <nav className={`navbar fixed-top navbar-expand-lg navbar-${mode} bg-${mode}`}>
                <div className="container-fluid">
                    <img src={t2s} alt="Logo" width={30} height={30} />

                    <Link className="navbar-brand" to="/"><h4>&nbsp; Text-2-Speech</h4></Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                        <Link className={"nav-link active"} aria-current="page" to="/"><h5>Home</h5></Link>
                        </li>
                    </ul>
                    <div className="form-check form-switch ">
                        <input className="form-check-input" readOnly={true} type="checkbox" role="switch" id="flexSwitchCheckDefault"  onClick={ChangeMode} checked={mode==="dark"?true:false} />
                        <label className={`form-check-label text-${mode==="light"?"dark":"light"} mx-2`} htmlFor="flexSwitchCheckDefault">{mode==="light"?"Dark Mode":"Light Mode"}</label>
                    </div>
                    </div>
                </div>
            </nav>
        </div>
    )
}