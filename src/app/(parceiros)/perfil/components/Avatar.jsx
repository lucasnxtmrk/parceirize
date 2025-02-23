import { useState } from 'react';
import { Image } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';

const Avatar = ({ src, alt }) => {
    const [image, setImage] = useState(src);
    const [isEditing, setIsEditing] = useState(false);

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
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                transition: 'opacity 0.3s ease', // Adiciona transição para suavizar o hover
            }}
            onMouseEnter={handleEdit}
            onMouseLeave={() => setIsEditing(false)}
        >
            <Image
                src={image}
                alt={alt}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease', // Transição na imagem ao editar
                }}
            />
            {isEditing && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0)', // Começa transparente
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.3s ease', // Transição suave do background
                    }}
                >
                    <div // Div extra para o conteúdo do overlay
                        style={{
                            opacity: 0, // Começa invisível
                            transition: 'opacity 0.3s ease', // Transição suave da opacidade
                            display: 'flex',
                            flexDirection: 'column', // Alinha verticalmente
                            alignItems: 'center',
                        }}
                    >
                        <label htmlFor="imageInput" style={{ cursor: 'pointer' }}>
                            <IconifyIcon icon="bx:camera" color="white" size="2em" /> {/* Ícone maior */}
                        </label>
                        <input
                            type="file"
                            id="imageInput"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                        />
                         <span style={{color: 'white', marginTop: '0.5em'}}>Editar</span> {/* Texto "Editar" */}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Avatar;