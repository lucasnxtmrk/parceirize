"use client"; 
import { useState, useEffect } from "react";
import { Image } from "react-bootstrap";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

const Avatar = ({ src, alt }) => {
    const [image, setImage] = useState(src || "/assets/images/avatar.jpg");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setImage(src || "/assets/images/avatar.jpg");
    }, [src]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onloadend = () => {
            setImage(reader.result);
            setIsEditing(false);
        };

        if (file) {
            reader.readAsDataURL(file);
        }
    };

    return (
        <div
            style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                overflow: "hidden",
                position: "relative",
                cursor: "pointer",
                transition: "opacity 0.3s ease",
            }}
            onMouseEnter={handleEdit}
            onMouseLeave={() => setIsEditing(false)}
        >
            <Image
                src={image}
                alt={alt}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.3s ease",
                }}
            />
            {isEditing && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background-color 0.3s ease",
                    }}
                >
                    <div
                        style={{
                            opacity: 1,
                            transition: "opacity 0.3s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <label htmlFor="imageInput" style={{ cursor: "pointer" }}>
                            <IconifyIcon icon="bx:camera" color="white" size="2em" />
                        </label>
                        <input
                            type="file"
                            id="imageInput"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleImageChange}
                        />
                        <span style={{ color: "white", marginTop: "0.5em" }}>Editar</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Avatar;